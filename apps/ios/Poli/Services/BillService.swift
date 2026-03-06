import Foundation

struct BillWithCategories: Identifiable {
    let bill: Bill
    let categories: [BillCategory]
    var id: UUID { bill.id }
}

@MainActor
class BillService: ObservableObject {
    private let client = SupabaseConfig.client

    func fetchBills(stateCode: String) async throws -> [Bill] {
        let jurisdictions: [Jurisdiction] = try await client.from("jurisdictions")
            .select()
            .or("level.eq.federal,and(level.eq.state,state_code.eq.\(stateCode))")
            .execute().value

        let ids = jurisdictions.map { $0.id }
        guard !ids.isEmpty else { return [] }

        let bills: [Bill] = try await client.from("bills")
            .select()
            .in("jurisdiction_id", values: ids)
            .order("updated_at", ascending: false)
            .limit(30)
            .execute().value

        return bills
    }

    func fetchCategories(billId: UUID) async -> [BillCategory] {
        (try? await client.from("bill_categories")
            .select().eq("bill_id", value: billId).execute().value) ?? []
    }

    func fetchSummary(billId: UUID) async -> AiSummary? {
        try? await client.from("ai_summaries")
            .select().eq("bill_id", value: billId)
            .order("generated_at", ascending: false)
            .limit(1).single().execute().value
    }

    func fetchTextVersion(billId: UUID) async -> BillTextVersion? {
        try? await client.from("bill_text_versions")
            .select().eq("bill_id", value: billId)
            .limit(1).single().execute().value
    }

    func fetchBillText(storagePath: String) async -> String? {
        guard let data = try? await client.storage.from("bill-text").download(path: storagePath) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func fetchUserBookmarks(userId: UUID) async -> Set<UUID> {
        let bookmarks: [UserBookmark] = (try? await client.from("user_bookmarks")
            .select().eq("user_id", value: userId).execute().value) ?? []
        return Set(bookmarks.map(\.billId))
    }

    func toggleBookmark(userId: UUID, billId: UUID, isBookmarked: Bool) async {
        if isBookmarked {
            try? await client.from("user_bookmarks")
                .delete().eq("user_id", value: userId).eq("bill_id", value: billId).execute()
        } else {
            struct Insert: Encodable { let user_id: UUID; let bill_id: UUID }
            try? await client.from("user_bookmarks")
                .insert(Insert(user_id: userId, bill_id: billId)).execute()
        }
    }
}
