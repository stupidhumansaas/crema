import SwiftUI

/// Bean list — dark theme matching Stitch design system
struct BeansView: View {
    @State private var beans = Bean.mockList
    @State private var searchText = ""
    @State private var selectedBean: Bean?
    @State private var selectedFilter: RoastLevel?

    private var filteredBeans: [Bean] {
        var result = beans
        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.roaster.localizedCaseInsensitiveContains(searchText) ||
                ($0.origin?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        if let filter = selectedFilter {
            result = result.filter { $0.roastLevel == filter }
        }
        return result
    }

    var body: some View {
        ZStack {
            Color.espressoDeep.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                HStack {
                    Text("Beans")
                        .font(.cremaHeading)
                        .foregroundColor(.cream)
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 12)

                // Search
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 16))
                        .foregroundColor(.cream.opacity(0.3))

                    TextField("Search beans or roasters...", text: $searchText)
                        .font(.cremaSmall)
                        .foregroundColor(.cream)
                }
                .padding(12)
                .background(Color.cardDark)
                .cornerRadius(12)
                .padding(.horizontal, 20)

                // Filters
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(label: "All", isSelected: selectedFilter == nil) {
                            selectedFilter = nil
                        }
                        ForEach(RoastLevel.allCases, id: \.self) { level in
                            FilterChip(label: "\(level.emoji) \(level.rawValue)", isSelected: selectedFilter == level) {
                                selectedFilter = level
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                }

                // List
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 10) {
                        ForEach(filteredBeans) { bean in
                            BeanRow(bean: bean)
                                .onTapGesture {
                                    HapticsService.shared.buttonTapHaptic()
                                    selectedBean = bean
                                }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                }
            }
        }
        .sheet(item: $selectedBean) { bean in
            BeanDetailView(bean: bean)
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: {
            HapticsService.shared.buttonTapHaptic()
            action()
        }) {
            Text(label)
                .font(.cremaSmall)
                .foregroundColor(isSelected ? .espressoDeep : .cream.opacity(0.6))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Color.cremaOrange : Color.cardDark)
                .cornerRadius(20)
        }
    }
}

// MARK: - Bean Row

struct BeanRow: View {
    let bean: Bean

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.cardDark)
                    .frame(width: 48, height: 48)
                Text(bean.roastLevel.emoji)
                    .font(.system(size: 22))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(bean.name)
                    .font(.cremaSmall)
                    .fontWeight(.semibold)
                    .foregroundColor(.cream)
                Text(bean.roaster)
                    .font(.cremaTiny)
                    .foregroundColor(.cream.opacity(0.4))
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                StarRatingView(rating: bean.averageRating, size: 12)
                Text("\(bean.totalRatings) ratings")
                    .font(.cremaTiny)
                    .foregroundColor(.cream.opacity(0.3))
            }
        }
        .padding(14)
        .background(Color.cardDark)
        .cornerRadius(14)
    }
}

// MARK: - Star Rating

struct StarRatingView: View {
    let rating: Double
    var size: CGFloat = 16
    var interactive: Bool = false
    var onRate: ((Double) -> Void)?

    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: starImage(for: star))
                    .font(.system(size: size))
                    .foregroundColor(starColor(for: star))
                    .onTapGesture {
                        if interactive {
                            HapticsService.shared.buttonTapHaptic()
                            onRate?(Double(star))
                        }
                    }
            }
        }
    }

    private func starImage(for star: Int) -> String {
        let threshold = Double(star)
        if rating >= threshold { return "star.fill" }
        else if rating >= threshold - 0.5 { return "star.leadinghalf.filled" }
        else { return "star" }
    }

    private func starColor(for star: Int) -> Color {
        Double(star) <= rating + 0.5 ? Color.cremaOrange : Color.cream.opacity(0.15)
    }
}
