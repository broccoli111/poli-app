import SwiftUI

struct SentimentBarView: View {
    let support: Int
    let oppose: Int
    let neutral: Int
    let total: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geo in
                HStack(spacing: 0) {
                    if support > 0 {
                        Rectangle().fill(Color.supportGreen)
                            .frame(width: geo.size.width * Double(support) / Double(max(total, 1)))
                    }
                    if neutral > 0 {
                        Rectangle().fill(Color.textMuted)
                            .frame(width: geo.size.width * Double(neutral) / Double(max(total, 1)))
                    }
                    if oppose > 0 {
                        Rectangle().fill(Color.opposeRed)
                            .frame(width: geo.size.width * Double(oppose) / Double(max(total, 1)))
                    }
                }
                .cornerRadius(10)
            }
            .frame(height: 20)

            HStack {
                Text("Support \(pct(support))%").font(.caption2).foregroundColor(.supportGreen)
                Spacer()
                Text("Neutral \(pct(neutral))%").font(.caption2).foregroundColor(.textMuted)
                Spacer()
                Text("Oppose \(pct(oppose))%").font(.caption2).foregroundColor(.opposeRed)
            }
            Text("\(total) votes").font(.caption2).foregroundColor(.textMuted)
        }
    }

    private func pct(_ n: Int) -> Int {
        total > 0 ? Int(round(Double(n) / Double(total) * 100)) : 0
    }
}
