import UIKit

/// Service for managing haptic feedback throughout the app
/// Provides tactile feedback for various user interactions following CREMA's "mechanical camera" feel
class HapticsService {
    // MARK: - Singleton

    static let shared = HapticsService()

    // MARK: - Generators

    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let notificationGenerator = UINotificationFeedbackGenerator()

    // MARK: - Initialization

    private init() {
        // Pre-warm generators for instant response
        prepareAll()
    }

    // MARK: - Preparation

    /// Pre-warm all generators for instant response
    func prepareAll() {
        heavyImpact.prepare()
        mediumImpact.prepare()
        lightImpact.prepare()
        selectionGenerator.prepare()
        notificationGenerator.prepare()
    }

    /// Prepare specific generator before expected trigger (call 0.1s before use)
    func prepareForShutter() {
        heavyImpact.prepare()
    }

    func prepareForSteam() {
        mediumImpact.prepare()
        selectionGenerator.prepare()
    }

    func prepareForScoreReveal() {
        lightImpact.prepare()
        heavyImpact.prepare()
    }

    // MARK: - Core Haptic Actions

    /// Shutter button press - Heavy mechanical camera feel
    /// This is the signature haptic of the app
    func shutterHaptic() {
        heavyImpact.impactOccurred()
        // Re-prepare for next use
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.heavyImpact.prepare()
        }
    }

    /// Photo successfully captured - Success feedback
    func photoCapturedHaptic() {
        notificationGenerator.notificationOccurred(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.notificationGenerator.prepare()
        }
    }

    /// Steam (like) button double-tap - Medium impact + selection
    func steamHaptic() {
        mediumImpact.impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            self?.selectionGenerator.selectionChanged()
        }
        // Re-prepare
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.mediumImpact.prepare()
            self?.selectionGenerator.prepare()
        }
    }

    /// Score reveal animation - Custom pattern (slot machine feel)
    /// Pattern: tick (light) → tick (light) → tick (medium) → BUMP (heavy)
    func scoreRevealHaptic() {
        // First tick (light)
        lightImpact.impactOccurred()

        // Second tick (light) after 150ms
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.lightImpact.impactOccurred()
        }

        // Third tick (medium) after 300ms
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.mediumImpact.impactOccurred()
        }

        // Final bump (heavy) after 450ms
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { [weak self] in
            self?.heavyImpact.impactOccurred()
        }

        // Re-prepare all after sequence
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
            self?.prepareForScoreReveal()
        }
    }

    /// Individual score tick during animation - Light feedback
    func scoreTickHaptic() {
        selectionGenerator.selectionChanged()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            self?.selectionGenerator.prepare()
        }
    }

    /// Button tap - Light selection feedback
    func buttonTapHaptic() {
        selectionGenerator.selectionChanged()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            self?.selectionGenerator.prepare()
        }
    }

    /// Navigation/transition - Selection feedback
    func navigationHaptic() {
        selectionGenerator.selectionChanged()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            self?.selectionGenerator.prepare()
        }
    }

    /// Success action completed - Success notification
    func successHaptic() {
        notificationGenerator.notificationOccurred(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.notificationGenerator.prepare()
        }
    }

    /// Warning feedback - Warning notification
    func warningHaptic() {
        notificationGenerator.notificationOccurred(.warning)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.notificationGenerator.prepare()
        }
    }

    /// Error feedback - Error notification
    func errorHaptic() {
        notificationGenerator.notificationOccurred(.error)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.notificationGenerator.prepare()
        }
    }

    // MARK: - Complex Haptic Sequences

    /// Pour saved successfully - Success + light impact
    func pourSavedHaptic() {
        successHaptic()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.lightImpact.impactOccurred()
        }
    }

    /// Streak milestone achieved - Multiple impacts
    func streakMilestoneHaptic() {
        mediumImpact.impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.mediumImpact.impactOccurred()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.heavyImpact.impactOccurred()
        }
    }

    /// Subscription unlocked - Success + medium impact
    func subscriptionUnlockedHaptic() {
        notificationGenerator.notificationOccurred(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.mediumImpact.impactOccurred()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.heavyImpact.impactOccurred()
        }
    }
}

// MARK: - SwiftUI Integration

#if canImport(SwiftUI)
import SwiftUI

/// SwiftUI extension for easy haptic access in views
extension View {
    func onShutterPress() -> some View {
        self.onTapGesture {
            HapticsService.shared.shutterHaptic()
        }
    }

    func onSteamTap() -> some View {
        self.onTapGesture(count: 2) {
            HapticsService.shared.steamHaptic()
        }
    }

    func onButtonPress() -> some View {
        self.onTapGesture {
            HapticsService.shared.buttonTapHaptic()
        }
    }
}
#endif
