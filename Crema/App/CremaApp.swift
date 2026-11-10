import SwiftUI

/// CREMA - The Daily Coffee Ritual
/// Main app entry point with zero-loading camera experience
@main
struct CremaApp: App {
    // MARK: - App Delegate

    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    // MARK: - Scene

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .onAppear {
                    HapticsService.shared.prepareAll()
                }
        }
    }
}

/// App Delegate for handling app lifecycle events
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Pre-configure camera session for zero-loading startup
        Task {
            let cameraService = CameraService()
            try? await cameraService.setupCamera()
        }

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // App is about to become inactive (e.g., phone call, notification)
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // App entered background - camera will stop automatically
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // App is about to enter foreground
        // Camera will restart when CameraView appears
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // App became active
        // Re-prepare haptics for instant response
        HapticsService.shared.prepareAll()
    }
}
