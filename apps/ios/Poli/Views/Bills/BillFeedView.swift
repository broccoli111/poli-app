import SwiftUI

struct BillFeedView: View {
    @EnvironmentObject var auth: AuthService
    @StateObject private var service = BillService()
    @State private var bills: [Bill] = []
    @State private var bookmarkIds: Set<UUID> = []
    @State private var loading = true

    var body: some View {
        Group {
            if loading {
                ProgressView("Loading bills...")
            } else if bills.isEmpty {
                EmptyStateView(title: "No bills found",
                              message: "Bills for your area will appear once data is ingested.")
            } else {
                List(bills) { bill in
                    NavigationLink(destination: BillDetailView(billId: bill.id)) {
                        BillRowView(bill: bill,
                                   isBookmarked: bookmarkIds.contains(bill.id),
                                   showEye: bookmarkIds.contains(bill.id))
                    }
                    .swipeActions(edge: .trailing) {
                        Button {
                            toggleBookmark(bill.id)
                        } label: {
                            Image(systemName: bookmarkIds.contains(bill.id) ? "star.slash" : "star.fill")
                        }
                        .tint(.yellow)
                    }
                }
                .listStyle(.plain)
                .refreshable { await load() }
            }
        }
        .navigationTitle("Bills")
        .task { await load() }
    }

    private func load() async {
        guard let stateCode = auth.address?.stateCode else { return }
        loading = true
        bills = (try? await service.fetchBills(stateCode: stateCode)) ?? []
        if let userId = auth.session?.user.id {
            bookmarkIds = await service.fetchUserBookmarks(userId: userId)
        }
        loading = false
    }

    private func toggleBookmark(_ billId: UUID) {
        guard let userId = auth.session?.user.id else { return }
        let isBookmarked = bookmarkIds.contains(billId)
        if isBookmarked { bookmarkIds.remove(billId) } else { bookmarkIds.insert(billId) }
        Task { await service.toggleBookmark(userId: userId, billId: billId, isBookmarked: isBookmarked) }
    }
}

struct BillRowView: View {
    let bill: Bill
    let isBookmarked: Bool
    let showEye: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(bill.billNumber)
                    .font(.caption).fontWeight(.semibold)
                    .foregroundColor(.textMuted)
                Spacer()
                if showEye { Image(systemName: "eye").foregroundColor(.textMuted).font(.caption) }
                if isBookmarked { Image(systemName: "star.fill").foregroundColor(.yellow).font(.caption) }
            }
            Text(bill.title)
                .font(.subheadline).fontWeight(.medium)
                .lineLimit(2)
            HStack(spacing: 6) {
                ChipView(text: bill.statusDisplay)
                if let date = bill.expectedVoteDateFormatted {
                    Text("Vote: \(date)")
                        .font(.caption2)
                        .foregroundColor(.warningAmber)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
