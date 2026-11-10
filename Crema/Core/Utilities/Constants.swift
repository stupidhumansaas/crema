import Foundation

/// App-wide constants and configuration
enum Constants {
    // MARK: - App Information

    enum App {
        static let name = "CREMA"
        static let tagline = "The Daily Coffee Ritual"
        static let minimumIOSVersion = "16.0"
    }

    // MARK: - API Endpoints

    enum API {
        static let openAIBaseURL = "https://api.openai.com/v1"
        static let supabaseURL = "https://vabmhosgnzbqwimdpxe.supabase.co"

        // Model versions
        static let openAIModel = "gpt-4o-mini"  // Vision model
    }

    // MARK: - Free Tier Limits

    enum FreeTier {
        static let dailySnapLimit = 1
        static let hasFilters = false
        static let hasAnalytics = false
    }

    // MARK: - Premium (Crema Gold)

    enum Premium {
        static let monthlyPrice = "$2.99"
        static let productID = "com.crema.gold.monthly"

        // Premium features
        static let unlimitedSnaps = true
        static let filmGrainFilter = true
        static let vintageFilter = true
        static let customWatermarks = true
        static let analytics = true
    }

    // MARK: - Camera Settings

    enum Camera {
        static let targetStartupTime: TimeInterval = 0.2 // 200ms
        static let maxImageSize = 1080 // pixels (for square crop)
        static let compressionQuality: CGFloat = 0.8
        static let targetFileSize = 1_000_000 // 1MB for OpenAI upload
    }

    // MARK: - Polaroid Dimensions

    enum Polaroid {
        // Square format
        static let imageSize = 1000 // pixels
        static let borderWidth = 40 // pixels
        static let totalWidth = imageSize + (borderWidth * 2) // 1080px

        // Instagram Stories format (9:16)
        static let storiesWidth = 1080
        static let storiesHeight = 1920

        // Text overlay positions (in pixels from edges)
        static let streakPadding: CGFloat = 40
        static let locationBottomPadding: CGFloat = 100
        static let timePadding: CGFloat = 70
        static let roastBottomPadding: CGFloat = 40

        // Watermark
        static let watermarkText = "Captured on Crema"
        static let watermarkSize: CGFloat = 12
    }

    // MARK: - Scoring System

    enum Scoring {
        static let minScore: Double = 1.0
        static let maxScore: Double = 10.0

        // AI System Prompt
        static let systemPrompt = """
        You are an elite, slightly snobby coffee sommelier. Analyze the image.
        1. Rate the 'Vibe' from 1.0 to 10.0 based on lighting, latte art, and aesthetic.
        2. Identify the vessel (Ceramic, Paper, Glass, Plastic).
        3. Provide individual scores for: latte art, lighting, vessel, composition (0-10 each).
        4. Write a 5-8 word 'Roast' that is either a compliment or a witty critique.
        5. OUTPUT FORMAT: JSON only, no markdown:
        {
          "score": 8.7,
          "vessel": "Ceramic",
          "roast": "Elite foam, but the bean is basic.",
          "factors": {
            "latteArtScore": 9.0,
            "lightingScore": 8.5,
            "vesselScore": 9.0,
            "compositionScore": 8.5
          }
        }
        """
    }

    // MARK: - Social Features

    enum Social {
        static let feedPageSize = 20 // pours per page
        static let maxFollowing = 1000
        static let maxFollowers = 100000

        // Streak rules
        static let streakWindowHours: TimeInterval = 24
        static let streakTimeZone = "UTC"
    }

    // MARK: - Haptic Timings

    enum Haptics {
        static let prepareOffset: TimeInterval = 0.1 // seconds before trigger
        static let shutterDuration: TimeInterval = 0.2
        static let scoreTickInterval: TimeInterval = 0.15
        static let heavyImpactDelay: TimeInterval = 0.45
    }

    // MARK: - Animation Durations

    enum Animation {
        static let flashDuration: TimeInterval = 0.2
        static let scoreCounterDuration: TimeInterval = 2.0
        static let roastFadeIn: TimeInterval = 0.5
        static let buttonPress: TimeInterval = 0.1
        static let buttonRelease: TimeInterval = 0.1
    }

    // MARK: - Fonts

    enum Typography {
        static let fontFamily = "PlayfairDisplay"
        static let boldSuffix = "-Bold"
        static let semiBoldSuffix = "-SemiBold"
        static let italicSuffix = "-Italic"
    }

    // MARK: - Color Hex Values

    enum Colors {
        static let creamHex = "#FFFDD0"
        static let espressoHex = "#3D2B1F"
    }
}

// MARK: - Environment Variables

/// Access environment variables from .env file
enum AppEnvironment {
    // Supabase
    static var supabaseURL: String {
        ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? Constants.API.supabaseURL
    }

    static var supabaseServiceRoleKey: String {
        ProcessInfo.processInfo.environment["SUPERBASE"] ?? ""
    }

    // OpenAI
    static var openAIAPIKey: String {
        ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? ""
    }

    // Cloudinary
    static var cloudinaryCloudName: String {
        ProcessInfo.processInfo.environment["CLOUDINARY_CLOUD_NAME"] ?? ""
    }

    static var cloudinaryAPIKey: String {
        ProcessInfo.processInfo.environment["CLOUDINARY_API_KEY"] ?? ""
    }

    static var cloudinaryUploadPreset: String {
        ProcessInfo.processInfo.environment["CLOUDINARY_UPLOAD_PRESET"] ?? "crema_pours"
    }

    // RevenueCat
    static var revenueCatKey: String {
        ProcessInfo.processInfo.environment["REV_CAT_KEY"] ?? ""
    }

    static var revenueCatSecret: String {
        ProcessInfo.processInfo.environment["REV_CAT_SECRET"] ?? ""
    }
}
