import Foundation

@MainActor
class PoliticianService {
    private let client = SupabaseConfig.client

    func fetchPolitician(id: UUID) async throws -> Politician {
        try await client.from("politicians").select().eq("id", value: id).single().execute().value
    }

    func fetchHonesty(politicianId: UUID) async -> (score: HonestyScore?, evidence: [HonestyEvidence]) {
        let score: HonestyScore? = try? await client.from("honesty_scores")
            .select().eq("politician_id", value: politicianId)
            .order("computed_at", ascending: false).limit(1).single().execute().value

        guard let score else { return (nil, []) }

        let evidence: [HonestyEvidence] = (try? await client.from("honesty_evidence")
            .select().eq("honesty_score_id", value: score.id)
            .order("created_at", ascending: false).limit(3).execute().value) ?? []

        return (score, evidence)
    }

    func fetchFunding(politicianId: UUID) async -> PoliticianFunding? {
        try? await client.from("politician_funding")
            .select().eq("politician_id", value: politicianId)
            .order("fetched_at", ascending: false).limit(1).single().execute().value
    }

    func isFederal(jurisdictionId: UUID?) async -> Bool {
        guard let jid = jurisdictionId else { return false }
        struct JLevel: Decodable { let level: String }
        let j: JLevel? = try? await client.from("jurisdictions")
            .select("level").eq("id", value: jid).single().execute().value
        return j?.level == "federal"
    }
}
