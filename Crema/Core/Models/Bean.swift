import Foundation

/// Coffee bean model for rating and tracking
struct Bean: Identifiable, Codable, Hashable {
    /// Unique bean identifier
    let id: UUID

    /// Bean name (e.g., "Ethiopia Yirgacheffe")
    var name: String

    /// Roaster name (e.g., "Blue Bottle")
    var roaster: String

    /// Origin/region (e.g., "Ethiopia", "Colombia")
    var origin: String?

    /// Roast level
    var roastLevel: RoastLevel

    /// Average rating across all user ratings (1-5 stars)
    var averageRating: Double

    /// Total number of ratings received
    var totalRatings: Int

    /// Date the bean was added to the database
    let createdAt: Date

    // MARK: - Computed Properties

    /// Display name combining bean name and roaster
    var displayName: String {
        "\(name) by \(roaster)"
    }

    /// Formatted average rating (e.g., "4.5 ★")
    var formattedRating: String {
        String(format: "%.1f ★", averageRating)
    }
}

/// Roast level categories
enum RoastLevel: String, Codable, CaseIterable {
    case light = "Light"
    case medium = "Medium"
    case dark = "Dark"

    /// Emoji representation
    var emoji: String {
        switch self {
        case .light: return "🤎"
        case .medium: return "🍂"
        case .dark: return "🖤"
        }
    }
}

/// User's rating for a specific bean
struct BeanRating: Identifiable, Codable, Hashable {
    /// Unique rating identifier
    let id: UUID

    /// User who created the rating
    let userId: UUID

    /// Bean being rated
    let beanId: UUID

    /// Star rating (1-5)
    let rating: Double

    /// Optional tasting notes
    let notes: String?

    /// When the rating was created
    let createdAt: Date
}

// MARK: - Mock Data for Testing

extension Bean {
    /// Mock bean for development/testing
    static let mock = Bean(
        id: UUID(),
        name: "Ethiopia Yirgacheffe",
        roaster: "Blue Bottle",
        origin: "Ethiopia",
        roastLevel: .light,
        averageRating: 4.7,
        totalRatings: 42,
        createdAt: Date().addingTimeInterval(-86400 * 90) // 90 days ago
    )

    /// Mock bean with medium roast
    static let mockMedium = Bean(
        id: UUID(),
        name: "Colombia Supremo",
        roaster: "Sightglass",
        origin: "Colombia",
        roastLevel: .medium,
        averageRating: 4.3,
        totalRatings: 28,
        createdAt: Date().addingTimeInterval(-86400 * 60)
    )

    /// Mock bean with dark roast
    static let mockDark = Bean(
        id: UUID(),
        name: "French Roast",
        roaster: "Philz",
        origin: nil,
        roastLevel: .dark,
        averageRating: 3.9,
        totalRatings: 15,
        createdAt: Date().addingTimeInterval(-86400 * 30)
    )

    /// Array of mock beans for testing
    static let mockList: [Bean] = [.mock, .mockMedium, .mockDark]
}

extension BeanRating {
    /// Mock bean rating
    static let mock = BeanRating(
        id: UUID(),
        userId: UUID(),
        beanId: UUID(),
        rating: 5.0,
        notes: "Amazing floral notes and bright acidity!",
        createdAt: Date().addingTimeInterval(-86400 * 7) // 1 week ago
    )
}
