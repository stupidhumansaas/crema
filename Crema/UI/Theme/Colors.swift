import SwiftUI

/// CREMA brand colors — dark espresso base with orange accent (from Stitch design)
extension Color {
    /// Cream (#FFFDD0) - Light accent for text on dark backgrounds
    static let cream = Color(hex: "#FFFDD0")

    /// Espresso (#3D2B1F) - Primary dark background
    static let espresso = Color(hex: "#3D2B1F")

    /// Deep Espresso (#1A1210) - Darker variant for cards/sections
    static let espressoDeep = Color(hex: "#1A1210")

    /// Burnt Orange (#E67919) - Primary accent color (buttons, highlights)
    static let cremaOrange = Color(hex: "#E67919")

    /// Card background on dark surfaces
    static let cardDark = Color(hex: "#2A1F18")

    /// Helper initializer for hex colors
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
