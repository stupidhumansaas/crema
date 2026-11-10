import UIKit

/// Generates Polaroid-style framed images locally
/// Overlays streak count, vibe score, roast, location, and watermark
class PolaroidService {
    static let shared = PolaroidService()
    private init() {}

    /// Generate a Polaroid-framed image from a coffee photo and its metadata
    func generatePolaroid(
        image: UIImage,
        vibeScore: VibeScore,
        streakDays: Int,
        location: String?,
        timestamp: Date = Date()
    ) -> UIImage {
        let totalWidth = CGFloat(Constants.Polaroid.totalWidth)
        let imageSize = CGFloat(Constants.Polaroid.imageSize)
        let border = CGFloat(Constants.Polaroid.borderWidth)
        let bottomBorder: CGFloat = 140 // Extra space at bottom for metadata
        let totalHeight = imageSize + border + bottomBorder

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: totalWidth, height: totalHeight))

        return renderer.image { ctx in
            let context = ctx.cgContext

            // 1. White Polaroid frame
            UIColor.white.setFill()
            context.fill(CGRect(x: 0, y: 0, width: totalWidth, height: totalHeight))

            // 2. Drop shadow behind the frame
            context.setShadow(offset: CGSize(width: 0, height: 4), blur: 20, color: UIColor.black.withAlphaComponent(0.15).cgColor)

            // 3. Draw the coffee photo (cropped to square)
            let photoRect = CGRect(x: border, y: border, width: imageSize, height: imageSize)
            let croppedImage = cropToSquare(image)
            croppedImage.draw(in: photoRect)

            // Reset shadow
            context.setShadow(offset: .zero, blur: 0)

            // 4. Streak badge (top-left over photo)
            let streakText = "\(streakDays) Days Brewed"
            drawStreakBadge(streakText, in: context, at: CGPoint(x: border + 16, y: border + 16))

            // 5. Vibe score badge (top-right over photo)
            let scoreText = String(format: "%.1f", vibeScore.score)
            drawScoreBadge(scoreText, in: context, at: CGPoint(x: totalWidth - border - 16, y: border + 16))

            // 6. Bottom metadata area
            let metaY = border + imageSize + 16

            // Roast text (centered)
            let roastAttr: [NSAttributedString.Key: Any] = [
                .font: UIFont(name: "PlayfairDisplay-Italic", size: 16) ?? UIFont.italicSystemFont(ofSize: 16),
                .foregroundColor: UIColor(red: 0.24, green: 0.17, blue: 0.12, alpha: 0.8)
            ]
            let roastString = NSAttributedString(string: "\"\(vibeScore.roast)\"", attributes: roastAttr)
            let roastSize = roastString.size()
            let roastX = (totalWidth - roastSize.width) / 2
            roastString.draw(at: CGPoint(x: roastX, y: metaY))

            // Location + Time (bottom-left)
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "h:mm a"
            let timeString = timeFormatter.string(from: timestamp)

            var bottomLeftText = timeString
            if let location = location {
                bottomLeftText = "\(location)  \u{00B7}  \(timeString)"
            }

            let bottomAttr: [NSAttributedString.Key: Any] = [
                .font: UIFont(name: "PlayfairDisplay-Regular", size: 12) ?? UIFont.systemFont(ofSize: 12),
                .foregroundColor: UIColor(red: 0.24, green: 0.17, blue: 0.12, alpha: 0.5)
            ]
            let bottomString = NSAttributedString(string: bottomLeftText, attributes: bottomAttr)
            bottomString.draw(at: CGPoint(x: border + 4, y: metaY + 40))

            // Vessel type (bottom-center-right area)
            let vesselAttr: [NSAttributedString.Key: Any] = [
                .font: UIFont(name: "PlayfairDisplay-Regular", size: 12) ?? UIFont.systemFont(ofSize: 12),
                .foregroundColor: UIColor(red: 0.24, green: 0.17, blue: 0.12, alpha: 0.4)
            ]
            let vesselString = NSAttributedString(string: vibeScore.vessel.rawValue, attributes: vesselAttr)
            let vesselSize = vesselString.size()
            vesselString.draw(at: CGPoint(x: totalWidth - border - vesselSize.width - 4, y: metaY + 40))

            // 7. Watermark (bottom-right)
            let watermarkAttr: [NSAttributedString.Key: Any] = [
                .font: UIFont(name: "PlayfairDisplay-Regular", size: CGFloat(Constants.Polaroid.watermarkSize)) ?? UIFont.systemFont(ofSize: CGFloat(Constants.Polaroid.watermarkSize)),
                .foregroundColor: UIColor(red: 0.24, green: 0.17, blue: 0.12, alpha: 0.25)
            ]
            let watermark = NSAttributedString(string: Constants.Polaroid.watermarkText, attributes: watermarkAttr)
            let watermarkSize = watermark.size()
            watermark.draw(at: CGPoint(x: totalWidth - border - watermarkSize.width - 4, y: totalHeight - 24))
        }
    }

    /// Generate Stories-format (9:16) image with Polaroid centered
    func generateStoriesImage(polaroid: UIImage) -> UIImage {
        let width = CGFloat(Constants.Polaroid.storiesWidth)
        let height = CGFloat(Constants.Polaroid.storiesHeight)

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height))

        return renderer.image { ctx in
            // Cream background
            UIColor(red: 1.0, green: 0.99, blue: 0.82, alpha: 1.0).setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

            // Center the Polaroid
            let polaroidAspect = polaroid.size.width / polaroid.size.height
            let maxWidth = width * 0.85
            let polaroidWidth = maxWidth
            let polaroidHeight = polaroidWidth / polaroidAspect
            let x = (width - polaroidWidth) / 2
            let y = (height - polaroidHeight) / 2 - 40 // Slightly above center

            // Slight rotation for authenticity
            let context = ctx.cgContext
            context.saveGState()
            context.translateBy(x: width / 2, y: height / 2 - 40)
            context.rotate(by: -0.02) // ~1 degree
            context.translateBy(x: -width / 2, y: -(height / 2 - 40))

            // Shadow
            context.setShadow(offset: CGSize(width: 0, height: 8), blur: 30, color: UIColor.black.withAlphaComponent(0.2).cgColor)

            polaroid.draw(in: CGRect(x: x, y: y, width: polaroidWidth, height: polaroidHeight))

            context.restoreGState()
        }
    }

    // MARK: - Private Helpers

    private func cropToSquare(_ image: UIImage) -> UIImage {
        guard let cgImage = image.cgImage else { return image }
        let side = min(cgImage.width, cgImage.height)
        let x = (cgImage.width - side) / 2
        let y = (cgImage.height - side) / 2
        guard let cropped = cgImage.cropping(to: CGRect(x: x, y: y, width: side, height: side)) else { return image }
        return UIImage(cgImage: cropped, scale: image.scale, orientation: image.imageOrientation)
    }

    private func drawStreakBadge(_ text: String, in context: CGContext, at point: CGPoint) {
        let attr: [NSAttributedString.Key: Any] = [
            .font: UIFont(name: "PlayfairDisplay-SemiBold", size: 13) ?? UIFont.boldSystemFont(ofSize: 13),
            .foregroundColor: UIColor.white
        ]
        let string = NSAttributedString(string: text, attributes: attr)
        let size = string.size()
        let padding: CGFloat = 10
        let rect = CGRect(x: point.x, y: point.y, width: size.width + padding * 2, height: size.height + padding)

        // Background pill
        context.setFillColor(UIColor(red: 0.24, green: 0.17, blue: 0.12, alpha: 0.7).cgColor)
        let path = UIBezierPath(roundedRect: rect, cornerRadius: rect.height / 2)
        context.addPath(path.cgPath)
        context.fillPath()

        string.draw(at: CGPoint(x: rect.origin.x + padding, y: rect.origin.y + padding / 2))
    }

    private func drawScoreBadge(_ score: String, in context: CGContext, at point: CGPoint) {
        let attr: [NSAttributedString.Key: Any] = [
            .font: UIFont(name: "PlayfairDisplay-Bold", size: 18) ?? UIFont.boldSystemFont(ofSize: 18),
            .foregroundColor: UIColor.white
        ]
        let string = NSAttributedString(string: score, attributes: attr)
        let size = string.size()
        let padding: CGFloat = 10
        let rect = CGRect(x: point.x - size.width - padding * 2, y: point.y, width: size.width + padding * 2, height: size.height + padding)

        context.setFillColor(UIColor(red: 0.24, green: 0.17, blue: 0.12, alpha: 0.7).cgColor)
        let path = UIBezierPath(roundedRect: rect, cornerRadius: rect.height / 2)
        context.addPath(path.cgPath)
        context.fillPath()

        string.draw(at: CGPoint(x: rect.origin.x + padding, y: rect.origin.y + padding / 2))
    }
}
