import SwiftUI

/// Main tab navigation — dark espresso theme, Camera is center stage
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            FeedView()
                .tabItem {
                    Image(systemName: "rectangle.grid.1x2.fill")
                    Text("Feed")
                }
                .tag(0)

            CameraView()
                .tabItem {
                    Image(systemName: "camera.fill")
                    Text("Pour")
                }
                .tag(1)

            BeansView()
                .tabItem {
                    Image(systemName: "leaf.fill")
                    Text("Beans")
                }
                .tag(2)

            ProfileView()
                .tabItem {
                    Image(systemName: "person.fill")
                    Text("Profile")
                }
                .tag(3)
        }
        .tint(.cremaOrange)
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(red: 0.10, green: 0.07, blue: 0.06, alpha: 1.0) // espressoDeep

            // Unselected items
            let normal = UITabBarItemAppearance()
            normal.normal.iconColor = UIColor(white: 1.0, alpha: 0.3)
            normal.normal.titleTextAttributes = [.foregroundColor: UIColor(white: 1.0, alpha: 0.3)]

            // Selected items — orange
            normal.selected.iconColor = UIColor(red: 0.9, green: 0.47, blue: 0.1, alpha: 1.0) // cremaOrange
            normal.selected.titleTextAttributes = [.foregroundColor: UIColor(red: 0.9, green: 0.47, blue: 0.1, alpha: 1.0)]

            appearance.stackedLayoutAppearance = normal
            appearance.inlineLayoutAppearance = normal
            appearance.compactInlineLayoutAppearance = normal

            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance

            // Start on Camera tab
            selectedTab = 1
        }
    }
}
