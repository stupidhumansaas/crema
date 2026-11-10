import SwiftUI
import AVFoundation

/// Main camera view — Stitch "Snap-to-Log Viewfinder" design
/// Dark viewfinder with streak badge, mode tabs, and copper shutter button
struct CameraView: View {
    @StateObject private var cameraService = CameraService()
    @State private var isCapturing = false
    @State private var showingError = false
    @State private var navigateToScoring = false
    @State private var selectedMode = "AESTHETIC"

    @State private var currentStreak = 14

    private let modes = ["ROAST", "AESTHETIC", "TIMER"]

    private var isSimulator: Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }

    var body: some View {
        ZStack {
            Color.espressoDeep.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                // Top bar: X, streak, grid
                topBar
                    .padding(.top, 8)

                // Camera preview area
                ZStack {
                    if isSimulator {
                        SimulatorCameraPreview()
                    } else if cameraService.isCameraAuthorized {
                        CameraPreviewView(session: cameraService.session)
                    } else {
                        PermissionDeniedView()
                    }

                    // Score overlay (bottom-right of preview)
                    VStack {
                        Spacer()
                        HStack {
                            // VIBE FOCUS label
                            Text("VIBE FOCUS")
                                .font(.cremaTiny)
                                .foregroundColor(.cream.opacity(0.5))
                                .tracking(1)
                            Spacer()
                            // Score preview
                            Text("9.2")
                                .font(.system(size: 18, weight: .bold, design: .serif))
                                .foregroundColor(.cream)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(Color.black.opacity(0.5))
                                .cornerRadius(8)
                        }
                        .padding(12)
                    }

                    // Flash
                    if isCapturing {
                        Color.white.opacity(0.8).transition(.opacity)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 16)
                .padding(.top, 8)

                Spacer()

                // Mode tabs
                HStack(spacing: 0) {
                    ForEach(modes, id: \.self) { mode in
                        Button(action: {
                            HapticsService.shared.buttonTapHaptic()
                            selectedMode = mode
                        }) {
                            Text(mode)
                                .font(.cremaTiny)
                                .fontWeight(selectedMode == mode ? .bold : .regular)
                                .foregroundColor(selectedMode == mode ? .cremaOrange : .cream.opacity(0.4))
                                .tracking(1)
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(.vertical, 12)

                // Shutter button
                ShutterButton {
                    capturePhoto()
                }
                .padding(.bottom, 24)
            }
        }
        .onAppear {
            if !isSimulator { setupCamera() }
        }
        .onDisappear {
            if !isSimulator { cameraService.stopSession() }
        }
        .alert("Camera Error", isPresented: $showingError) {
            Button("OK") { showingError = false }
        } message: {
            if let error = cameraService.error {
                Text(error.errorDescription ?? "Unknown error")
            }
        }
        .fullScreenCover(isPresented: $navigateToScoring) {
            if let capturedImage = cameraService.capturedImage {
                ScoringView(image: capturedImage)
            }
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Button(action: {}) {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.cream.opacity(0.6))
                    .frame(width: 36, height: 36)
            }

            Spacer()

            // Streak
            VStack(spacing: 2) {
                Text("CURRENT STREAK")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.cremaOrange)
                    .tracking(2)

                Text("\(currentStreak) Days Brewed")
                    .font(.system(size: 18, weight: .bold, design: .serif))
                    .foregroundColor(.cream)
            }

            Spacer()

            Button(action: {}) {
                Image(systemName: "photo.on.rectangle")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.cream.opacity(0.6))
                    .frame(width: 36, height: 36)
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Camera Setup & Capture

    private func setupCamera() {
        Task {
            do {
                try await cameraService.setupCamera()
                cameraService.startSession()
            } catch {
                await MainActor.run { showingError = true }
            }
        }
    }

    private func capturePhoto() {
        guard !isCapturing else { return }

        if isSimulator {
            isCapturing = true
            HapticsService.shared.shutterHaptic()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                isCapturing = false
                let renderer = UIGraphicsImageRenderer(size: CGSize(width: 1080, height: 1080))
                let mockImage = renderer.image { ctx in
                    UIColor(red: 0.35, green: 0.2, blue: 0.1, alpha: 1.0).setFill()
                    ctx.fill(CGRect(x: 0, y: 0, width: 1080, height: 1080))
                    UIColor(red: 0.85, green: 0.82, blue: 0.75, alpha: 1.0).setFill()
                    ctx.cgContext.fillEllipse(in: CGRect(x: 240, y: 240, width: 600, height: 600))
                    UIColor(red: 0.4, green: 0.25, blue: 0.15, alpha: 1.0).setFill()
                    ctx.cgContext.fillEllipse(in: CGRect(x: 300, y: 300, width: 480, height: 480))
                    UIColor(red: 0.9, green: 0.88, blue: 0.8, alpha: 0.7).setFill()
                    ctx.cgContext.fillEllipse(in: CGRect(x: 420, y: 380, width: 240, height: 180))
                }
                cameraService.capturedImage = mockImage
                navigateToScoring = true
            }
            return
        }

        Task {
            isCapturing = true
            do {
                _ = try await cameraService.capturePhoto()
                HapticsService.shared.photoCapturedHaptic()
                try await Task.sleep(nanoseconds: 200_000_000)
                await MainActor.run {
                    isCapturing = false
                    navigateToScoring = true
                }
            } catch {
                await MainActor.run {
                    isCapturing = false
                    showingError = true
                }
            }
        }
    }
}

// MARK: - Simulator Camera Preview

struct SimulatorCameraPreview: View {
    var body: some View {
        ZStack {
            Color(red: 0.12, green: 0.09, blue: 0.07)

            LinearGradient(
                colors: [
                    Color(red: 0.25, green: 0.15, blue: 0.08),
                    Color(red: 0.1, green: 0.07, blue: 0.04)
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            VStack(spacing: 16) {
                Image(systemName: "cup.and.saucer.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.cream.opacity(0.15))

                Text("SIMULATOR")
                    .font(.cremaTiny)
                    .foregroundColor(.cream.opacity(0.2))
                    .tracking(4)
            }
        }
    }
}

// MARK: - Camera Preview

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        context.coordinator.previewLayer = previewLayer
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewLayer = context.coordinator.previewLayer {
            DispatchQueue.main.async {
                previewLayer.frame = uiView.bounds
            }
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator {
        var previewLayer: AVCaptureVideoPreviewLayer?
    }
}

// MARK: - Permission Denied View

struct PermissionDeniedView: View {
    var body: some View {
        ZStack {
            Color.espressoDeep

            VStack(spacing: 20) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.cream.opacity(0.3))

                Text("Camera Access Required")
                    .font(.cremaHeading)
                    .foregroundColor(.cream)

                Text("CREMA needs camera access to capture your daily coffee moments")
                    .font(.cremaSmall)
                    .foregroundColor(.cream.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)

                Button(action: {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }) {
                    Text("Open Settings")
                        .font(.cremaBody)
                        .fontWeight(.semibold)
                        .foregroundColor(.espresso)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 14)
                        .background(Color.cremaOrange)
                        .cornerRadius(30)
                }
            }
        }
    }
}

#if DEBUG
struct CameraView_Previews: PreviewProvider {
    static var previews: some View {
        CameraView()
    }
}
#endif
