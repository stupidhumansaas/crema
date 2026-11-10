import Foundation

/// A coffee pour (photo) with associated metadata and vibe score
struct CoffeePour: Identifiable, Codable, Hashable {
    /// Unique pour identifier
    let id: UUID

    /// ID of the user who created this pour
    let userId: UUID

    /// URL to the original coffee photo (Cloudinary)
    let imageURL: String

    /// URL to the framed Polaroid version (Cloudinary)
    let polaroidURL: String

    /// AI-generated vibe score and critique
    var vibeScore: VibeScore

    /// Location name (e.g., "Blue Bottle, SF")
    let location: String?

    /// Timestamp when the pour was created
    let timestamp: Date

    /// Number of steams (likes) received
    var steamCount: Int

    /// Optional link to a coffee bean
    var beanId: UUID?

    /// Whether this pour is visible to followers (vs private)
    var isPublic: Bool

    // MARK: - Computed Properties

    /// Formatted timestamp for display (e.g., "8:24 AM")
    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: timestamp)
    }

    /// Formatted date for display (e.g., "Mar 3, 2026")
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: timestamp)
    }

    /// Time ago string (e.g., "2h ago", "3d ago")
    var timeAgo: String {
        let interval = Date().timeIntervalSince(timestamp)
        let hours = Int(interval / 3600)
        let days = Int(interval / 86400)

        if days > 0 {
            return "\(days)d ago"
        } else if hours > 0 {
            return "\(hours)h ago"
        } else {
            return "Just now"
        }
    }
}

// MARK: - Mock Data for Testing

extension CoffeePour {
    /// Mock coffee pour for development/testing
    static let mock = CoffeePour(
        id: UUID(),
        userId: UUID(),
        imageURL: "https://via.placeholder.com/1000x1000",
        polaroidURL: "https://via.placeholder.com/1080x1350",
        vibeScore: .mock,
        location: "Blue Bottle, SF",
        timestamp: Date().addingTimeInterval(-7200), // 2 hours ago
        steamCount: 42,
        beanId: nil,
        isPublic: true
    )

    /// Mock recent pour
    static let mockRecent = CoffeePour(
        id: UUID(),
        userId: UUID(),
        imageURL: "https://via.placeholder.com/1000x1000",
        polaroidURL: "https://via.placeholder.com/1080x1350",
        vibeScore: .mockHigh,
        location: "Sightglass Coffee",
        timestamp: Date().addingTimeInterval(-600), // 10 minutes ago
        steamCount: 8,
        beanId: nil,
        isPublic: true
    )

    /// Array of mock pours for feed testing
    static let mockFeed: [CoffeePour] = [
        .mockRecent,
        .mock,
        CoffeePour(
            id: UUID(),
            userId: UUID(),
            imageURL: "https://via.placeholder.com/1000x1000",
            polaroidURL: "https://via.placeholder.com/1080x1350",
            vibeScore: VibeScore(
                score: 7.5,
                vessel: .glass,
                roast: "Solid execution, nothing fancy.",
                factors: ScoringFactors(
                    latteArtScore: 7.0,
                    lightingScore: 8.0,
                    vesselScore: 8.0,
                    compositionScore: 7.0
                )
            ),
            location: "Philz Coffee",
            timestamp: Date().addingTimeInterval(-86400), // 1 day ago
            steamCount: 23,
            beanId: nil,
            isPublic: true
        )
    ]
}
