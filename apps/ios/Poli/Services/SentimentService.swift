import Foundation

@MainActor
class SentimentService {
    private let client = SupabaseConfig.client

    func fetchUserVote(userId: UUID, billId: UUID) async -> String? {
        let result: UserBillSentiment? = try? await client.from("user_bill_sentiment")
            .select().eq("user_id", value: userId).eq("bill_id", value: billId)
            .single().execute().value
        return result?.vote
    }

    func submitVote(userId: UUID, billId: UUID, vote: String, jurisdictionId: UUID) async throws {
        struct Existing: Decodable { let id: UUID; let vote: String }

        let existing: Existing? = try? await client.from("user_bill_sentiment")
            .select("id,vote").eq("user_id", value: userId).eq("bill_id", value: billId)
            .single().execute().value

        let oldVote = existing?.vote

        if let existing {
            struct Update: Encodable { let vote: String; let voted_at: String }
            try await client.from("user_bill_sentiment")
                .update(Update(vote: vote, voted_at: ISO8601DateFormatter().string(from: Date())))
                .eq("id", value: existing.id).execute()
        } else {
            struct Insert: Encodable { let user_id: UUID; let bill_id: UUID; let vote: String }
            try await client.from("user_bill_sentiment")
                .insert(Insert(user_id: userId, bill_id: billId, vote: vote)).execute()
        }

        await updateAggregate(billId: billId, jurisdictionId: jurisdictionId, newVote: vote, oldVote: oldVote)
    }

    func fetchAggregate(billId: UUID, jurisdictionId: UUID) async -> BillSentimentAggregate? {
        try? await client.from("bill_sentiment_aggregate")
            .select().eq("bill_id", value: billId).eq("jurisdiction_id", value: jurisdictionId)
            .single().execute().value
    }

    private func updateAggregate(billId: UUID, jurisdictionId: UUID, newVote: String, oldVote: String?) async {
        let agg: BillSentimentAggregate? = try? await client.from("bill_sentiment_aggregate")
            .select().eq("bill_id", value: billId).eq("jurisdiction_id", value: jurisdictionId)
            .single().execute().value

        var support = agg?.supportCount ?? 0
        var oppose = agg?.opposeCount ?? 0
        var neutral = agg?.neutralCount ?? 0
        var total = agg?.totalVotes ?? 0

        if let old = oldVote {
            switch old {
            case "support": support = max(0, support - 1)
            case "oppose": oppose = max(0, oppose - 1)
            case "neutral": neutral = max(0, neutral - 1)
            default: break
            }
            total = max(0, total - 1)
        }

        switch newVote {
        case "support": support += 1
        case "oppose": oppose += 1
        case "neutral": neutral += 1
        default: break
        }
        total += 1

        struct AggData: Encodable {
            let bill_id: UUID; let jurisdiction_id: UUID
            let support_count: Int; let oppose_count: Int; let neutral_count: Int; let total_votes: Int
        }

        let data = AggData(bill_id: billId, jurisdiction_id: jurisdictionId,
                           support_count: support, oppose_count: oppose, neutral_count: neutral, total_votes: total)

        if agg != nil {
            try? await client.from("bill_sentiment_aggregate")
                .update(data).eq("bill_id", value: billId).eq("jurisdiction_id", value: jurisdictionId).execute()
        } else {
            try? await client.from("bill_sentiment_aggregate").insert(data).execute()
        }
    }
}
