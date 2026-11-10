import SwiftUI

/// CREMA typography using Playfair Display serif font
extension Font {
    // MARK: - Playfair Display Custom Font

    /// Large title (34pt) - Used for main headings
    static let cremaTitle = Font.custom("PlayfairDisplay-Bold", size: 34)

    /// Title (28pt) - Used for section titles
    static let cremaHeading = Font.custom("PlayfairDisplay-Bold", size: 28)

    /// Headline (24pt) - Used for streak counter
    static let cremaSubheading = Font.custom("PlayfairDisplay-SemiBold", size: 24)

    /// Body (18pt) - Used for primary text
    static let cremaBody = Font.custom("PlayfairDisplay-Regular", size: 18)

    /// Body italic (18pt) - Used for roast critiques
    static let cremaRoast = Font.custom("PlayfairDisplay-Italic", size: 18)

    /// Caption (16pt) - Used for metadata
    static let cremaCaption = Font.custom("PlayfairDisplay-Regular", size: 16)

    /// Small caption (14pt) - Used for timestamps
    static let cremaSmall = Font.custom("PlayfairDisplay-Regular", size: 14)

    /// Tiny caption (12pt) - Used for watermarks
    static let cremaTiny = Font.custom("PlayfairDisplay-Regular", size: 12)
}

/// Typography constants for non-SwiftUI contexts (UIKit)
struct CremaTypography {
    static let titleSize: CGFloat = 34
    static let headingSize: CGFloat = 28
    static let subheadingSize: CGFloat = 24
    static let bodySize: CGFloat = 18
    static let captionSize: CGFloat = 16
    static let smallSize: CGFloat = 14
    static let tinySize: CGFloat = 12

    static let fontName = "PlayfairDisplay"
    static let fontNameBold = "PlayfairDisplay-Bold"
    static let fontNameSemiBold = "PlayfairDisplay-SemiBold"
    static let fontNameItalic = "PlayfairDisplay-Italic"
}
