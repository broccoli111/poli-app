import SwiftUI

struct BillDetailView: View {
    let billId: UUID
    @EnvironmentObject var auth: AuthService
    @State private var bill: Bill?
    @State private var categories: [BillCategory] = []
    @State private var summary: AiSummary?
    @State private var billText: String?
    @State private var userVote: String?
    @State private var aggregate: BillSentimentAggregate?
    @State private var activeTab = 0
    @State private var loading = true
    @State private var voting = false

    private let billService = BillService()
    private let sentimentService = SentimentService()

    var body: some View {
        if loading {
            ProgressView("Loading...")
                .task { await load() }
        } else if let bill {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    headerSection(bill)
                    tabSection
                    if let agg = aggregate, agg.totalVotes > 0 {
                        sentimentSection(agg)
                    }
                }
                .padding()
                .padding(.bottom, 100)
            }
            .overlay(alignment: .bottom) { voteBar(bill) }
            .navigationTitle(bill.billNumber)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            EmptyStateView(title: "Bill not found", message: nil)
        }
    }

    private func headerSection(_ bill: Bill) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(bill.billNumber).font(.caption).foregroundColor(.textMuted)
                Spacer()
                if let date = bill.expectedVoteDateFormatted {
                    Text("Vote: \(date)").font(.caption).foregroundColor(.warningAmber).fontWeight(.semibold)
                }
            }
            Text(bill.title).font(.title3).fontWeight(.semibold)
            if let desc = bill.description { Text(desc).font(.caption).foregroundColor(.textSecondary) }
            FlowLayout(spacing: 6) {
                ChipView(text: bill.statusDisplay)
                ForEach(categories) { c in ChipView(text: c.category) }
            }
        }
        .padding().background(Color.white).cornerRadius(12).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))
    }

    private var tabSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("Tab", selection: $activeTab) {
                Text("AI Summary").tag(0)
                Text("Original Text").tag(1)
            }
            .pickerStyle(.segmented)

            if activeTab == 0 {
                if let summary {
                    Text(summary.summaryText).font(.body)
                    if !summary.themes.isEmpty {
                        FlowLayout(spacing: 6) {
                            ForEach(summary.themes, id: \.self) { t in ChipView(text: t) }
                        }
                    }
                } else {
                    Text("Summary not yet available. Summaries are generated nightly.")
                        .foregroundColor(.textMuted).font(.callout)
                }
            } else {
                if let text = billText {
                    Text(text).font(.caption).lineLimit(nil)
                } else {
                    Text("Bill text not yet available.")
                        .foregroundColor(.textMuted).font(.callout)
                }
            }
        }
        .padding().background(Color.white).cornerRadius(12).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))
    }

    private func sentimentSection(_ agg: BillSentimentAggregate) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Community Sentiment").font(.subheadline).fontWeight(.semibold)
            SentimentBarView(support: agg.supportCount, oppose: agg.opposeCount, neutral: agg.neutralCount, total: agg.totalVotes)
        }
        .padding().background(Color.white).cornerRadius(12).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))
    }

    private func voteBar(_ bill: Bill) -> some View {
        VStack(spacing: 8) {
            if let v = userVote {
                Text("Your vote: \(v)").font(.caption).foregroundColor(.textSecondary)
            }
            HStack(spacing: 8) {
                voteButton("Support", vote: "support", color: .supportGreen)
                voteButton("Neutral", vote: "neutral", color: .accentBlue)
                voteButton("Oppose", vote: "oppose", color: .opposeRed)
                Button { openContactRep(bill) } label: {
                    Text("Contact Rep").font(.caption).fontWeight(.semibold)
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
    }

    private func voteButton(_ label: String, vote: String, color: Color) -> some View {
        Button {
            submitVote(vote)
        } label: {
            Text(label).font(.caption).fontWeight(.semibold)
                .frame(maxWidth: .infinity, minHeight: 36)
        }
        .background(userVote == vote ? color : Color.clear)
        .foregroundColor(userVote == vote ? .white : color)
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(color))
        .disabled(voting)
    }

    private func submitVote(_ vote: String) {
        guard let userId = auth.session?.user.id, let stateCode = auth.address?.stateCode else { return }
        voting = true
        Task {
            let jurisdictions: [Jurisdiction] = (try? await SupabaseConfig.client.from("jurisdictions")
                .select().or("level.eq.federal,and(level.eq.state,state_code.eq.\(stateCode))")
                .limit(1).execute().value) ?? []

            guard let jid = jurisdictions.first?.id else { voting = false; return }
            try? await sentimentService.submitVote(userId: userId, billId: billId, vote: vote, jurisdictionId: jid)
            userVote = vote
            aggregate = await sentimentService.fetchAggregate(billId: billId, jurisdictionId: jid)
            voting = false
        }
    }

    private func openContactRep(_ bill: Bill) {
        let subject = "Regarding: \(bill.billNumber) - \(bill.title)"
        let body = "Dear Representative,\n\nI am writing about \(bill.billNumber): \"\(bill.title)\".\n\n[Your message]\n\nSincerely,\nA concerned citizen"
        let mailto = "mailto:?subject=\(subject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&body=\(body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        if let url = URL(string: mailto) { UIApplication.shared.open(url) }
    }

    private func load() async {
        let client = SupabaseConfig.client
        bill = try? await client.from("bills").select().eq("id", value: billId).single().execute().value
        categories = await billService.fetchCategories(billId: billId)
        summary = await billService.fetchSummary(billId: billId)

        if let tv = await billService.fetchTextVersion(billId: billId) {
            billText = await billService.fetchBillText(storagePath: tv.storagePath)
        }

        if let userId = auth.session?.user.id {
            userVote = await sentimentService.fetchUserVote(userId: userId, billId: billId)
        }

        if let stateCode = auth.address?.stateCode {
            let jurisdictions: [Jurisdiction] = (try? await client.from("jurisdictions")
                .select().or("level.eq.federal,and(level.eq.state,state_code.eq.\(stateCode))")
                .limit(1).execute().value) ?? []
            if let jid = jurisdictions.first?.id {
                aggregate = await sentimentService.fetchAggregate(billId: billId, jurisdictionId: jid)
            }
        }
        loading = false
    }
}
