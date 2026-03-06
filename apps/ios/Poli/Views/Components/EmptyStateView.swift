import SwiftUI

struct EmptyStateView: View {
    let title: String
    let message: String?

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.textSecondary)
            if let message {
                Text(message)
                    .font(.subheadline)
                    .foregroundColor(.textMuted)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(48)
    }
}
