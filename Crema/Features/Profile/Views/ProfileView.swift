import SwiftUI

/// User profile — matches Stitch "User Coffee Gallery & Stats" design
/// Dark background, gold badge, tilted Polaroid gallery
struct ProfileView: View {
    @State private var user = User.mockPremium

    private let galleryItems = [
        "Mon. morning ritual",
        "Vibe Check x.1",
        "Pure Extraction",
        "Aero CAM"
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
                .padding(.bottom, 16)

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        // Avatar
                        ZStack {
                            Circle()
                                .fill(Color.espresso)
                                .frame(width: 90, height: 90)

                            Image(systemName: "person.fill")
                                .font(.system(size: 36))
                                .foregroundColor(.cream.opacity(0.3))
                        }
                        .overlay(
                            Circle()
                                .stroke(Color.cremaOrange, lineWidth: 3)
                        )

                        // Gold badge
                        if user.isPremium {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 10))
                                Text("GOLD")
                                    .font(.system(size: 10, weight: .bold))
                                    .tracking(2)
                            }
                            .foregroundColor(Color(red: 0.85, green: 0.7, blue: 0.3))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(Color(red: 0.85, green: 0.7, blue: 0.3).opacity(0.15))
                            .cornerRadius(12)
                        }

                        // Name
                        VStack(spacing: 4) {
                            Text("Julianne Vibe")
                                .font(.cremaHeading)
                                .foregroundColor(.cream)

                            Text("@crema_ritual")
                                .font(.cremaSmall)
                                .foregroundColor(.cremaOrange)
                        }

                        // Edit Ritual button
                        Button(action: {}) {
                            Text("EDIT RITUAL")
                                .font(.cremaTiny)
                                .fontWeight(.bold)
                                .foregroundColor(.cremaOrange)
                                .tracking(2)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 25)
                                        .stroke(Color.cremaOrange, lineWidth: 1.5)
                                )
                        }
                        .padding(.horizontal, 40)

                        // Stats
                        HStack(spacing: 0) {
                            statItem(value: "\(user.totalPours)", label: "DAILY POURS")
                            Rectangle().fill(Color.cream.opacity(0.1)).frame(width: 1, height: 40)
                            statItem(value: "1,280", label: "CREMA RANK")
                        }
                        .padding(.vertical, 16)
                        .background(Color.cardDark)
                        .cornerRadius(14)
                        .padding(.horizontal, 20)

                        // Total Streak
                        VStack(spacing: 4) {
                            Text("\(user.longestStreak)")
                                .font(.system(size: 48, weight: .bold, design: .serif))
                                .foregroundColor(.cremaOrange)

                            Text("TOTAL STREAK")
                                .font(.cremaTiny)
                                .foregroundColor(.cream.opacity(0.4))
                                .tracking(2)
                        }

                        // Gallery
                        VStack(alignment: .leading, spacing: 14) {
                            Text("DAILY POURS GALLERY")
                                .font(.cremaTiny)
                                .foregroundColor(.cream.opacity(0.4))
                                .tracking(2)
                                .padding(.horizontal, 20)

                            // 2x2 grid of tilted polaroids
                            LazyVGrid(columns: [
                                GridItem(.flexible(), spacing: 12),
                                GridItem(.flexible(), spacing: 12)
                            ], spacing: 12) {
                                ForEach(Array(galleryItems.enumerated()), id: \.offset) { index, title in
                                    galleryCard(title: title, rotation: index % 2 == 0 ? -3 : 3)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.cremaSubheading)
                .foregroundColor(.cream)

            Text(label)
                .font(.cremaTiny)
                .foregroundColor(.cream.opacity(0.4))
                .tracking(1)
        }
        .frame(maxWidth: .infinity)
    }

    private func galleryCard(title: String, rotation: Double) -> some View {
        VStack(spacing: 0) {
            // Photo
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.espresso)
                .frame(height: 130)
                .overlay(
                    Image(systemName: "cup.and.saucer.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.cream.opacity(0.1))
                )

            // Label
            Text(title)
                .font(.system(size: 10))
                .foregroundColor(.espresso.opacity(0.5))
                .lineLimit(1)
                .padding(.vertical, 8)
                .padding(.horizontal, 6)
        }
        .background(Color.white)
        .cornerRadius(4)
        .shadow(color: .black.opacity(0.3), radius: 6, x: 0, y: 3)
        .rotationEffect(.degrees(rotation))
    }
}
