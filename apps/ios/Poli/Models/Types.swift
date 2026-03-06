import Foundation

struct Jurisdiction: Codable, Identifiable {
    let id: UUID
    let level: String
    let stateCode: String?
    let districtNumber: String?
    let cityName: String?
    let name: String

    enum CodingKeys: String, CodingKey {
        case id, level, name
        case stateCode = "state_code"
        case districtNumber = "district_number"
        case cityName = "city_name"
    }
}

struct Profile: Codable {
    let id: UUID
    var displayName: String?
    var spectrumScore: Double?
    var alignmentRadar: [String: Double]?
    var watchedCategories: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case spectrumScore = "spectrum_score"
        case alignmentRadar = "alignment_radar"
        case watchedCategories = "watched_categories"
    }
}

struct Address: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let line1: String
    let line2: String?
    let city: String
    let stateCode: String
    let zip: String
    let federalHouse: String?
    let isPrimary: Bool

    enum CodingKeys: String, CodingKey {
        case id, line1, line2, city, zip
        case userId = "user_id"
        case stateCode = "state_code"
        case federalHouse = "federal_house"
        case isPrimary = "is_primary"
    }
}

struct Bill: Codable, Identifiable {
    let id: UUID
    let jurisdictionId: UUID
    let externalId: String?
    let billNumber: String
    let title: String
    let description: String?
    let status: String
    let statusDate: String?
    let introducedDate: String?
    let expectedVoteDate: String?
    let sourceUrl: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, description, status
        case jurisdictionId = "jurisdiction_id"
        case externalId = "external_id"
        case billNumber = "bill_number"
        case statusDate = "status_date"
        case introducedDate = "introduced_date"
        case expectedVoteDate = "expected_vote_date"
        case sourceUrl = "source_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var statusDisplay: String {
        status.replacingOccurrences(of: "_", with: " ")
    }

    var expectedVoteDateFormatted: String? {
        guard let d = expectedVoteDate else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        guard let date = f.date(from: String(d.prefix(10))) else { return d }
        let df = DateFormatter()
        df.dateStyle = .medium
        return df.string(from: date)
    }
}

struct BillCategory: Codable, Identifiable {
    let id: UUID
    let billId: UUID
    let category: String
    let confidence: Double?

    enum CodingKeys: String, CodingKey {
        case id, category, confidence
        case billId = "bill_id"
    }
}

struct AiSummary: Codable, Identifiable {
    let id: UUID
    let billId: UUID
    let summaryText: String
    let gradeLevel: Double
    let themes: [String]

    enum CodingKeys: String, CodingKey {
        case id, themes
        case billId = "bill_id"
        case summaryText = "summary_text"
        case gradeLevel = "grade_level"
    }
}

struct BillTextVersion: Codable, Identifiable {
    let id: UUID
    let billId: UUID
    let storagePath: String

    enum CodingKeys: String, CodingKey {
        case id
        case billId = "bill_id"
        case storagePath = "storage_path"
    }
}

struct UserBillSentiment: Codable {
    let id: UUID
    let vote: String
}

struct BillSentimentAggregate: Codable {
    let id: UUID
    let supportCount: Int
    let opposeCount: Int
    let neutralCount: Int
    let totalVotes: Int

    enum CodingKeys: String, CodingKey {
        case id
        case supportCount = "support_count"
        case opposeCount = "oppose_count"
        case neutralCount = "neutral_count"
        case totalVotes = "total_votes"
    }
}

struct UserBookmark: Codable {
    let id: UUID
    let billId: UUID

    enum CodingKeys: String, CodingKey {
        case id
        case billId = "bill_id"
    }
}

struct Politician: Codable, Identifiable {
    let id: UUID
    let fullName: String
    let party: String?
    let chamber: String?
    let jurisdictionId: UUID?
    let photoUrl: String?
    let bio: String?
    let website: String?
    let phone: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id, party, chamber, bio, website, phone, email
        case fullName = "full_name"
        case jurisdictionId = "jurisdiction_id"
        case photoUrl = "photo_url"
    }

    var partyDisplay: String {
        (party ?? "Unknown").capitalized
    }
}

struct HonestyScore: Codable, Identifiable {
    let id: UUID
    let politicianId: UUID
    let score: Double

    enum CodingKeys: String, CodingKey {
        case id, score
        case politicianId = "politician_id"
    }
}

struct HonestyEvidence: Codable, Identifiable {
    let id: UUID
    let evidenceType: String
    let description: String
    let sourceUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, description
        case evidenceType = "evidence_type"
        case sourceUrl = "source_url"
    }
}

struct PoliticianFunding: Codable {
    let id: UUID
    let cycle: String
    let totalRaised: Double?
    let totalSpent: Double?

    enum CodingKeys: String, CodingKey {
        case id, cycle
        case totalRaised = "total_raised"
        case totalSpent = "total_spent"
    }
}

struct AppNotification: Codable, Identifiable {
    let id: UUID
    let title: String
    let body: String
    var read: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, body, read
        case createdAt = "created_at"
    }
}

struct NotificationPref: Codable {
    var pushEnabled: Bool
    var emailEnabled: Bool
    var billStatusChange: Bool
    var weeklyDigest: Bool

    enum CodingKeys: String, CodingKey {
        case pushEnabled = "push_enabled"
        case emailEnabled = "email_enabled"
        case billStatusChange = "bill_status_change"
        case weeklyDigest = "weekly_digest"
    }
}

struct SurveyResponseRow: Codable {
    let userId: UUID
    let responses: [String: String]
    let spectrumScore: Double
    let alignmentRadar: [String: Double]?

    enum CodingKeys: String, CodingKey {
        case responses
        case userId = "user_id"
        case spectrumScore = "spectrum_score"
        case alignmentRadar = "alignment_radar"
    }
}
