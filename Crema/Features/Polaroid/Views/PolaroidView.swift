import SwiftUI

/// Displays the generated Polaroid and provides share/save actions
struct PolaroidView: View {
    let image: UIImage
    let vibeScore: VibeScore
    let streakDays: Int
    let location: String?

    @Environment(\.dismiss) private var dismiss
    @State private var polaroidImage: UIImage?
    @State private var showShareSheet = false
    @State private var saved = false

    var body: some View {
        ZStack {
            Color.cream.edgesIgnoringSafeArea(.all)

            VStack(spacing: 24) {
                // Top bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.espresso)
                            .frame(width: 40, height: 40)
                            .background(Color.espresso.opacity(0.1))
                            .clipShape(Circle())
                    }
                    Spacer()
                    Text("DAILY POUR")
                        .font(.cremaCaption)
                        .foregroundColor(.espresso.opacity(0.5))
                        .tracking(3)
                    Spacer()
                    Color.clear.frame(width: 40, height: 40)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                Spacer()

                // Polaroid preview
                if let polaroid = polaroidImage {
                    Image(uiImage: polaroid)
                        .resizable()
                        .scaledToFit()
                        .padding(.horizontal, 32)
                        .shadow(color: .black.opacity(0.15), radius: 20, x: 0, y: 10)
                }

                Spacer()

                // Action buttons
                VStack(spacing: 12) {
                    // Share to Stories
                    Button(action: shareToStories) {
                        HStack(spacing: 8) {
                            Image(systemName: "square.and.arrow.up")
                                .font(.system(size: 16, weight: .medium))
                            Text("Share to Stories")
                                .font(.cremaBody)
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.cream)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.espresso)
                        .cornerRadius(30)
                    }

                    // Save to Camera Roll
                    Button(action: saveToCameraRoll) {
                        HStack(spacing: 8) {
                            Image(systemName: saved ? "checkmark" : "arrow.down.to.line")
                                .font(.system(size: 16, weight: .medium))
                            Text(saved ? "Saved" : "Save to Photos")
                                .font(.cremaBody)
                        }
                        .foregroundColor(.espresso)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.espresso.opacity(0.1))
                        .cornerRadius(30)
                    }
                    .disabled(saved)

                    // Done
                    Button(action: { dismiss() }) {
                        Text("Done")
                            .font(.cremaBody)
                            .foregroundColor(.espresso.opacity(0.5))
                    }
                    .padding(.top, 4)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .onAppear {
            generatePolaroid()
        }
        .sheet(isPresented: $showShareSheet) {
            if let polaroid = polaroidImage {
                ShareSheet(items: [polaroid])
            }
        }
    }

    private func generatePolaroid() {
        polaroidImage = PolaroidService.shared.generatePolaroid(
            image: image,
            vibeScore: vibeScore,
            streakDays: streakDays,
            location: location
        )
    }

    private func shareToStories() {
        guard let polaroid = polaroidImage else { return }
        HapticsService.shared.buttonTapHaptic()

        // Generate stories-formatted image
        let storiesImage = PolaroidService.shared.generateStoriesImage(polaroid: polaroid)

        // Try Instagram Stories URL scheme first
        if let url = URL(string: "instagram-stories://share"),
           UIApplication.shared.canOpenURL(url),
           let imageData = storiesImage.pngData() {
            let pasteboardItems: [[String: Any]] = [
                ["com.instagram.sharedSticker.backgroundImage": imageData]
            ]
            UIPasteboard.general.setItems(pasteboardItems)
            UIApplication.shared.open(url)
        } else {
            // Fallback to share sheet
            showShareSheet = true
        }
    }

    private func saveToCameraRoll() {
        guard let polaroid = polaroidImage else { return }
        HapticsService.shared.buttonTapHaptic()
        UIImageWriteToSavedPhotosAlbum(polaroid, nil, nil, nil)
        saved = true
        HapticsService.shared.successHaptic()
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
