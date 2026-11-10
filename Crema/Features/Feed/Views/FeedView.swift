import SwiftUI

/// "The Cupping Room" — matches Stitch dark feed with cafe cards
struct FeedView: View {
    @State private var pours = CoffeePour.mockFeed
    @State private var steamed: Set<UUID> = []
    @State private var selectedTab = "CUPPING ROOM"

    private let cafes = [
        ("The Ritual Roasters", "Tokyo", "3h ago"),
        ("Monocle Caf\u{00E9}", "London", "1h ago"),
        ("Sey Coffee", "Brooklyn", "1h ago")
    ]

    var body: some View {
        ZStack {
            Color.espressoDeep.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("CREMA")
                        .font(.cremaHeading)
                        .foregroundColor(.cream)

                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 4)

                // Tab bar
                HStack(spacing: 0) {
                    tabButton("CUPPING ROOM")
                    tabButton("GLOBAL")
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 12)

                // Feed
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 20) {
                        ForEach(Array(cafes.enumerated()), id: \.offset) { index, cafe in
                            feedCard(
                                name: cafe.0,
                                location: cafe.1,
                                timeAgo: cafe.2,
                                isSteamed: index == 0
                            )
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 20)
                }
            }
        }
    }

    private func tabButton(_ title: String) -> some View {
        Button(action: { selectedTab = title }) {
            VStack(spacing: 6) {
                Text(title)
                    .font(.cremaTiny)
                    .fontWeight(selectedTab == title ? .bold : .regular)
                    .foregroundColor(selectedTab == title ? .cream : .cream.opacity(0.3))
                    .tracking(1)

                Rectangle()
                    .fill(selectedTab == title ? Color.cremaOrange : Color.clear)
                    .frame(height: 2)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func feedCard(name: String, location: String, timeAgo: String, isSteamed: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo area
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0.2, green: 0.14, blue: 0.1), Color(red: 0.12, green: 0.08, blue: 0.05)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(height: 220)
                    .overlay(
                        Image(systemName: "cup.and.saucer.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.cream.opacity(0.1))
                    )
            }

            // Info
            VStack(alignment: .leading, spacing: 6) {
                Text(name)
                    .font(.cremaBody)
                    .fontWeight(.semibold)
                    .foregroundColor(.cream)

                HStack(spacing: 8) {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.system(size: 10))
                        Text(location)
                            .font(.cremaTiny)
                    }
                    .foregroundColor(.cream.opacity(0.4))

                    Text("\u{2022}")
                        .foregroundColor(.cream.opacity(0.2))

                    Text(timeAgo)
                        .font(.cremaTiny)
                        .foregroundColor(.cream.opacity(0.4))

                    Spacer()

                    if isSteamed {
                        Text("STEAMED")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white)
                            .tracking(1)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(Color.cremaOrange)
                            .cornerRadius(14)
                    }
                }
            }
            .padding(14)
        }
        .background(Color.cardDark)
        .cornerRadius(16)
    }
}
