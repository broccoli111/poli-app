import SwiftUI

struct SpectrumBarView: View {
    let score: Double

    var body: some View {
        VStack(spacing: 4) {
            HStack {
                Text("Progressive").font(.caption2).foregroundColor(.textMuted)
                Spacer()
                Text("Moderate").font(.caption2).foregroundColor(.textMuted)
                Spacer()
                Text("Conservative").font(.caption2).foregroundColor(.textMuted)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    LinearGradient(
                        colors: [.accentBlue, .textMuted, .opposeRed],
                        startPoint: .leading, endPoint: .trailing
                    )
                    .cornerRadius(12)

                    Circle()
                        .fill(Color.white)
                        .overlay(Circle().stroke(Color.primary, lineWidth: 3))
                        .frame(width: 20, height: 20)
                        .offset(x: geo.size.width * min(max(score, 0), 100) / 100 - 10)
                }
            }
            .frame(height: 24)
        }
    }
}
