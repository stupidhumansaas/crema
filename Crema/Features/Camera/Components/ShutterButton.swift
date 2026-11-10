import SwiftUI

/// Copper-toned shutter button matching Stitch viewfinder design
struct ShutterButton: View {
    let action: () -> Void
    @State private var isPressed = false

    private let outerSize: CGFloat = 76
    private let innerSize: CGFloat = 62

    var body: some View {
        Button(action: handlePress) {
            ZStack {
                // Outer ring — warm copper
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color(red: 0.65, green: 0.42, blue: 0.22),
                                Color(red: 0.5, green: 0.3, blue: 0.15)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 5
                    )
                    .frame(width: outerSize, height: outerSize)

                // Inner fill — warm brown gradient
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color(red: 0.6, green: 0.38, blue: 0.2),
                                Color(red: 0.45, green: 0.28, blue: 0.14)
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: innerSize / 2
                        )
                    )
                    .frame(width: innerSize, height: innerSize)
                    .shadow(color: .black.opacity(0.4), radius: 8, x: 0, y: 4)
            }
        }
        .scaleEffect(isPressed ? 0.92 : 1.0)
        .animation(.spring(response: 0.25, dampingFraction: 0.6), value: isPressed)
        .buttonStyle(PlainButtonStyle())
    }

    private func handlePress() {
        HapticsService.shared.prepareForShutter()
        withAnimation(.easeInOut(duration: 0.08)) { isPressed = true }
        DispatchQueue.main.async { HapticsService.shared.shutterHaptic() }
        action()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            withAnimation(.easeInOut(duration: 0.08)) { isPressed = false }
        }
    }
}

#if DEBUG
struct ShutterButton_Previews: PreviewProvider {
    static var previews: some View {
        ShutterButton { }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.espressoDeep)
    }
}
#endif
