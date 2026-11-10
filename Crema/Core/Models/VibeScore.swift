import Foundation

/// AI-generated vibe score for a coffee photo
struct VibeScore: Codable, Hashable {
    /// The overall vibe score from 1.0 to 10.0
    let score: Double

    /// The type of vessel identified in the photo
    let vessel: VesselType

    /// A 5-8 word witty critique from the AI sommelier
    let roast: String

    /// Detailed breakdown of scoring factors
    let factors: ScoringFactors
}

/// Type of coffee vessel identified in the photo
enum VesselType: String, Codable, CaseIterable {
    case ceramic = "Ceramic"
    case glass = "Glass"
    case paper = "Paper"
    case plastic = "Plastic"

    /// Score multiplier based on vessel quality (Ceramic/Glass > Paper > Plastic)
    var scoreMultiplier: Double {
        switch self {
        case .ceramic, .glass: return 1.0
        case .paper: return 0.9
        case .plastic: return 0.7
        }
    }
}

/// Detailed breakdown of scoring factors
struct ScoringFactors: Codable, Hashable {
    /// Latte art quality (0-10)
    let latteArtScore: Double

    /// Lighting quality (0-10)
    let lightingScore: Double

    /// Vessel quality (0-10)
    let vesselScore: Double

    /// Composition quality (0-10)
    let compositionScore: Double

    /// Average of all factors
    var averageScore: Double {
        (latteArtScore + lightingScore + vesselScore + compositionScore) / 4.0
    }
}

// MARK: - Mock Data for Testing

extension VibeScore {
    /// Mock vibe score for development/testing
    static let mock = VibeScore(
        score: 8.7,
        vessel: .ceramic,
        roast: "Elite foam, but the bean is basic.",
        factors: ScoringFactors(
            latteArtScore: 9.0,
            lightingScore: 8.5,
            vesselScore: 9.0,
            compositionScore: 8.5
        )
    )

    /// Mock high score
    static let mockHigh = VibeScore(
        score: 9.8,
        vessel: .ceramic,
        roast: "Absolute perfection. Chef's kiss.",
        factors: ScoringFactors(
            latteArtScore: 10.0,
            lightingScore: 9.5,
            vesselScore: 10.0,
            compositionScore: 9.8
        )
    )

    /// Mock low score
    static let mockLow = VibeScore(
        score: 3.2,
        vessel: .plastic,
        roast: "Is this even coffee?",
        factors: ScoringFactors(
            latteArtScore: 2.0,
            lightingScore: 4.0,
            vesselScore: 3.5,
            compositionScore: 3.5
        )
    )
}
