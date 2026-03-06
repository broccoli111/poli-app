import SwiftUI

struct ChipView: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color.chipBackground)
            .foregroundColor(.accentBlue)
            .cornerRadius(12)
    }
}
