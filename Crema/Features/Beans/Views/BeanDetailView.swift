import SwiftUI

/// Detail view for a single bean with rating capability — dark theme
struct BeanDetailView: View {
    let bean: Bean
    @Environment(\.dismiss) private var dismiss
    @State private var userRating: Double = 0
    @State private var userNotes: String = ""
    @State private var hasRated = false

    var body: some View {
        ZStack {
            Color.espressoDeep.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                // Top bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.cream)
                            .frame(width: 40, height: 40)
                            .background(Color.cardDark)
                            .clipShape(Circle())
                    }
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Bean icon
                        ZStack {
                            Circle()
                                .fill(Color.cardDark)
                                .frame(width: 100, height: 100)

                            Text(bean.roastLevel.emoji)
                                .font(.system(size: 44))
                        }
                        .padding(.top, 12)

                        // Name and roaster
                        VStack(spacing: 6) {
                            Text(bean.name)
                                .font(.cremaHeading)
                                .foregroundColor(.cream)
                                .multilineTextAlignment(.center)

                            Text("by \(bean.roaster)")
                                .font(.cremaBody)
                                .foregroundColor(.cream.opacity(0.5))
                        }

                        // Stats row
                        HStack(spacing: 32) {
                            statItem(value: bean.formattedRating, label: "Avg Rating")

                            if let origin = bean.origin {
                                statItem(value: origin, label: "Origin")
                            }

                            statItem(value: bean.roastLevel.rawValue, label: "Roast")

                            statItem(value: "\(bean.totalRatings)", label: "Ratings")
                        }

                        // Community rating
                        VStack(spacing: 8) {
                            StarRatingView(rating: bean.averageRating, size: 24)

                            Text("\(bean.totalRatings) community ratings")
                                .font(.cremaTiny)
                                .foregroundColor(.cream.opacity(0.3))
                        }
                        .padding(.vertical, 8)

                        Rectangle()
                            .fill(Color.cream.opacity(0.08))
                            .frame(height: 1)
                            .padding(.horizontal, 40)

                        // User rating section
                        VStack(spacing: 16) {
                            Text("YOUR RATING")
                                .font(.cremaSmall)
                                .foregroundColor(.cream.opacity(0.4))
                                .tracking(2)

                            if hasRated {
                                VStack(spacing: 8) {
                                    StarRatingView(rating: userRating, size: 28)
                                    Text("Thanks for rating!")
                                        .font(.cremaSmall)
                                        .foregroundColor(.cream.opacity(0.5))
                                }
                            } else {
                                StarRatingView(rating: userRating, size: 28, interactive: true) { rating in
                                    userRating = rating
                                }

                                // Notes field
                                TextField("Tasting notes (optional)...", text: $userNotes, axis: .vertical)
                                    .font(.cremaSmall)
                                    .foregroundColor(.cream)
                                    .padding(14)
                                    .lineLimit(3...6)
                                    .background(Color.cardDark)
                                    .cornerRadius(12)
                                    .padding(.horizontal, 20)

                                // Submit button
                                Button(action: submitRating) {
                                    Text("Submit Rating")
                                        .font(.cremaBody)
                                        .fontWeight(.semibold)
                                        .foregroundColor(userRating > 0 ? .espressoDeep : .cream.opacity(0.3))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(userRating > 0 ? Color.cremaOrange : Color.cardDark)
                                        .cornerRadius(30)
                                }
                                .disabled(userRating == 0)
                                .padding(.horizontal, 20)
                            }
                        }
                        .padding(.top, 8)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
        }
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.cremaSmall)
                .fontWeight(.semibold)
                .foregroundColor(.cream)

            Text(label)
                .font(.cremaTiny)
                .foregroundColor(.cream.opacity(0.4))
        }
    }

    private func submitRating() {
        guard userRating > 0 else { return }
        HapticsService.shared.successHaptic()
        withAnimation(.easeOut(duration: 0.3)) {
            hasRated = true
        }
    }
}
