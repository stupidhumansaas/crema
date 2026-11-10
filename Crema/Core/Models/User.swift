import Foundation

/// User profile model
struct User: Identifiable, Codable, Hashable {
    /// Unique user identifier
    let id: UUID

    /// Unique username
    var username: String

    /// User email address
    var email: String

    /// URL to profile image (optional)
    var profileImageURL: String?

    /// Current daily streak count
    var currentStreak: Int

    /// Longest streak ever achieved
    var longestStreak: Int

    /// Total number of coffee pours
    var totalPours: Int

    /// Crema Rank (calculated based on streaks, quality, engagement)
    var cremaRank: Int

    /// Whether user has Crema Gold subscription
    var isPremium: Bool

    /// Account creation date
    let createdAt: Date

    /// Array of user IDs this user follows
    var following: [UUID]

    /// Array of user IDs following this user
    var followers: [UUID]

    /// Last date a pour was created (for streak tracking)
    var lastPourDate: Date?

    // MARK: - Computed Properties

    /// Number of users being followed
    var followingCount: Int {
        following.count
    }

    /// Number of followers
    var followerCount: Int {
        followers.count
    }

    /// Whether the user is on a streak (poured in last 24 hours)
    var isOnStreak: Bool {
        guard let lastPour = lastPourDate else { return false }
        let hoursSinceLastPour = Date().timeIntervalSince(lastPour) / 3600
        return hoursSinceLastPour <= 24
    }
}

// MARK: - Mock Data for Testing

extension User {
    /// Mock user for development/testing
    static let mock = User(
        id: UUID(),
        username: "coffee_lover",
        email: "coffee@example.com",
        profileImageURL: nil,
        currentStreak: 14,
        longestStreak: 45,
        totalPours: 127,
        cremaRank: 8,
        isPremium: false,
        createdAt: Date().addingTimeInterval(-86400 * 30), // 30 days ago
        following: [],
        followers: [],
        lastPourDate: Date().addingTimeInterval(-3600) // 1 hour ago
    )

    /// Mock premium user
    static let mockPremium = User(
        id: UUID(),
        username: "barista_pro",
        email: "pro@example.com",
        profileImageURL: nil,
        currentStreak: 67,
        longestStreak: 120,
        totalPours: 450,
        cremaRank: 10,
        isPremium: true,
        createdAt: Date().addingTimeInterval(-86400 * 180), // 180 days ago
        following: [],
        followers: [],
        lastPourDate: Date().addingTimeInterval(-1800) // 30 minutes ago
    )
}
