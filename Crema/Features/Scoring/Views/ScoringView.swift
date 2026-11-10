import SwiftUI

/// Vibe Score Result — matches Stitch "Vibe Score & Roast Result" design
/// Dark background, large score, inline Polaroid, orange Share to Story button
struct ScoringView: View {
    @StateObject private var viewModel: ScoringViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showShareSheet = false

    init(image: UIImage) {
        _viewModel = StateObject(wrappedValue: ScoringViewModel(image: image))
    }

    var body: some View {
        ZStack {
            Color.espressoDeep.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                topBar

                if viewModel.phase == .complete || viewModel.phase == .revealing {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 24) {
                            // VIBE SCORE label
                            Text("VIBE SCORE")
                                .font(.cremaTiny)
                                .foregroundColor(.cream.opacity(0.4))
                                .tracking(3)

                            // Large score
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", viewModel.displayedScore))
                                    .font(.system(size: 64, weight: .bold, design: .serif))
                                    .foregroundColor(.cream)
                                    .monospacedDigit()

                                Text("/10")
                                    .font(.system(size: 20, weight: .regular, design: .serif))
                                    .foregroundColor(.cream.opacity(0.4))
                            }

                            // Polaroid card
                            polaroidCard

                            // Roast text
                            if viewModel.showRoast, let score = viewModel.vibeScore {
                                Text("\"\(score.roast)\"")
                                    .font(.cremaRoast)
                                    .foregroundColor(.cream.opacity(0.9))
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 32)
                                    .transition(.opacity)
                            }

                            // Action buttons
                            if viewModel.showActions {
                                actionButtons
                            }
                        }
                        .padding(.top, 8)
                        .padding(.bottom, 40)
                    }
                }
            }

            if viewModel.phase == .analyzing {
                analyzingOverlay
            }

            if viewModel.phase == .error {
                errorOverlay
            }
        }
        .onAppear {
            if AppEnvironment.openAIAPIKey.isEmpty {
                viewModel.useMockScore()
            } else {
                viewModel.analyzePhoto()
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [generatePolaroid()].compactMap { $0 })
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.cream.opacity(0.6))
                    .frame(width: 36, height: 36)
            }

            Spacer()

            Text("RESULT")
                .font(.cremaTiny)
                .foregroundColor(.cremaOrange)
                .tracking(3)

            Spacer()

            Button(action: {}) {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.cream.opacity(0.6))
                    .frame(width: 36, height: 36)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
    }

    // MARK: - Polaroid Card

    private var polaroidCard: some View {
        VStack(spacing: 0) {
            Image(uiImage: viewModel.image)
                .resizable()
                .scaledToFill()
                .frame(width: 260, height: 260)
                .clipped()

            HStack {
                Text("CREMA RITUAL")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.espresso.opacity(0.4))
                    .tracking(1)

                Text("\u{2022}")
                    .foregroundColor(.espresso.opacity(0.3))

                Text(formattedTime)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.espresso.opacity(0.4))
            }
            .padding(.vertical, 10)
        }
        .background(Color.white)
        .cornerRadius(4)
        .shadow(color: .black.opacity(0.3), radius: 16, x: 0, y: 8)
        .padding(.horizontal, 48)
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "hh:mm a"
        return formatter.string(from: Date())
    }

    // MARK: - Actions

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: shareToStory) {
                HStack(spacing: 8) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                    Text("Share to Story")
                        .font(.cremaBody)
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.cremaOrange)
                .cornerRadius(30)
            }

            Button(action: saveToCameraRoll) {
                HStack(spacing: 8) {
                    Image(systemName: "bookmark.fill")
                        .font(.system(size: 14, weight: .medium))
                    Text("Save to Collection")
                        .font(.cremaBody)
                }
                .foregroundColor(.cream)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.espresso)
                .cornerRadius(30)
            }
        }
        .padding(.horizontal, 24)
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }

    // MARK: - Overlays

    private var analyzingOverlay: some View {
        ZStack {
            Color.espressoDeep.edgesIgnoringSafeArea(.all)
            VStack(spacing: 24) {
                Image(systemName: "cup.and.saucer.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.cremaOrange.opacity(0.6))
                    .modifier(PulseModifier())
                Text("Analyzing vibe...")
                    .font(.cremaBody)
                    .foregroundColor(.cream.opacity(0.8))
                Text("Our sommelier is judging your pour")
                    .font(.cremaSmall)
                    .foregroundColor(.cream.opacity(0.3))
            }
        }
    }

    private var errorOverlay: some View {
        ZStack {
            Color.espressoDeep.edgesIgnoringSafeArea(.all)
            VStack(spacing: 20) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.cremaOrange.opacity(0.6))
                Text(viewModel.errorMessage ?? "Something went wrong")
                    .font(.cremaBody)
                    .foregroundColor(.cream.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                HStack(spacing: 16) {
                    Button(action: { dismiss() }) {
                        Text("Back")
                            .font(.cremaBody)
                            .foregroundColor(.cream.opacity(0.6))
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.cream.opacity(0.1))
                            .cornerRadius(25)
                    }
                    Button(action: { viewModel.retry() }) {
                        Text("Try Again")
                            .font(.cremaBody)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.cremaOrange)
                            .cornerRadius(25)
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func shareToStory() {
        HapticsService.shared.buttonTapHaptic()
        guard let polaroid = generatePolaroid() else { return }
        let storiesImage = PolaroidService.shared.generateStoriesImage(polaroid: polaroid)
        if let url = URL(string: "instagram-stories://share"),
           UIApplication.shared.canOpenURL(url),
           let imageData = storiesImage.pngData() {
            UIPasteboard.general.setItems([["com.instagram.sharedSticker.backgroundImage": imageData]])
            UIApplication.shared.open(url)
        } else {
            showShareSheet = true
        }
    }

    private func saveToCameraRoll() {
        HapticsService.shared.buttonTapHaptic()
        guard let polaroid = generatePolaroid() else { return }
        UIImageWriteToSavedPhotosAlbum(polaroid, nil, nil, nil)
        HapticsService.shared.successHaptic()
    }

    private func generatePolaroid() -> UIImage? {
        guard let score = viewModel.vibeScore else { return nil }
        return PolaroidService.shared.generatePolaroid(
            image: viewModel.image, vibeScore: score, streakDays: 14, location: nil
        )
    }
}

private struct PulseModifier: ViewModifier {
    @State private var isPulsing = false
    func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.1 : 0.95)
            .opacity(isPulsing ? 1.0 : 0.6)
            .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isPulsing)
            .onAppear { isPulsing = true }
    }
}

#if DEBUG
struct ScoringView_Previews: PreviewProvider {
    static var previews: some View {
        ScoringView(image: UIImage(systemName: "cup.and.saucer.fill")!)
    }
}
#endif
