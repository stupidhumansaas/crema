import SwiftUI
import Combine

/// View model for the scoring flow
/// Manages the AI analysis, score animation, and state transitions
@MainActor
class ScoringViewModel: ObservableObject {
    // MARK: - State

    enum Phase {
        case analyzing
        case revealing
        case complete
        case error
    }

    @Published var phase: Phase = .analyzing
    @Published var vibeScore: VibeScore?
    @Published var displayedScore: Double = 0.0
    @Published var errorMessage: String?

    // Animation state
    @Published var showRoast = false
    @Published var showFactors = false
    @Published var showActions = false

    let image: UIImage

    // MARK: - Private

    private var scoreTimer: Timer?

    // MARK: - Init

    init(image: UIImage) {
        self.image = image
    }

    // MARK: - Analysis

    func analyzePhoto() {
        phase = .analyzing

        Task {
            do {
                let score = try await OpenAIService.shared.analyzePhoto(image)
                self.vibeScore = score
                self.phase = .revealing
                await animateScoreReveal(targetScore: score.score)
            } catch {
                self.errorMessage = error.localizedDescription
                self.phase = .error
                HapticsService.shared.errorHaptic()
            }
        }
    }

    /// Use mock data for simulator / when API key is missing
    func useMockScore() {
        phase = .analyzing

        Task {
            // Simulate network delay
            try? await Task.sleep(nanoseconds: 1_500_000_000)

            let score = VibeScore.mock
            self.vibeScore = score
            self.phase = .revealing
            await animateScoreReveal(targetScore: score.score)
        }
    }

    // MARK: - Score Animation

    /// Slot machine style counter animation
    private func animateScoreReveal(targetScore: Double) async {
        HapticsService.shared.prepareForScoreReveal()

        let totalSteps = 20
        let duration = Constants.Animation.scoreCounterDuration
        let stepInterval = duration / Double(totalSteps)

        for step in 0...totalSteps {
            let progress = Double(step) / Double(totalSteps)
            // Ease-out curve for a satisfying deceleration
            let easedProgress = 1.0 - pow(1.0 - progress, 3.0)
            let currentValue = easedProgress * targetScore

            displayedScore = (currentValue * 10).rounded() / 10

            if step < totalSteps {
                HapticsService.shared.scoreTickHaptic()
                try? await Task.sleep(nanoseconds: UInt64(stepInterval * 1_000_000_000))
            }
        }

        // Final score with heavy haptic
        displayedScore = targetScore
        HapticsService.shared.scoreRevealHaptic()

        // Reveal roast text
        try? await Task.sleep(nanoseconds: 500_000_000)
        withAnimation(.easeOut(duration: Constants.Animation.roastFadeIn)) {
            showRoast = true
        }

        // Reveal factor breakdown
        try? await Task.sleep(nanoseconds: 300_000_000)
        withAnimation(.easeOut(duration: 0.4)) {
            showFactors = true
        }

        // Reveal action buttons
        try? await Task.sleep(nanoseconds: 300_000_000)
        withAnimation(.easeOut(duration: 0.3)) {
            showActions = true
        }

        phase = .complete
    }

    func retry() {
        showRoast = false
        showFactors = false
        showActions = false
        displayedScore = 0.0
        vibeScore = nil
        errorMessage = nil

        if AppEnvironment.openAIAPIKey.isEmpty {
            useMockScore()
        } else {
            analyzePhoto()
        }
    }
}
