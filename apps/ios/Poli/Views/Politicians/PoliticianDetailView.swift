import SwiftUI

struct PoliticianDetailView: View {
    let politicianId: UUID
    @State private var politician: Politician?
    @State private var honesty: (score: HonestyScore?, evidence: [HonestyEvidence]) = (nil, [])
    @State private var funding: PoliticianFunding?
    @State private var fundingAvailable = true
    @State private var loading = true

    private let service = PoliticianService()

    var body: some View {
        if loading {
            ProgressView("Loading...").task { await load() }
        } else if let pol = politician {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    profileHeader(pol)
                    honestySection
                    fundingSection
                    reportSection(pol)
                }
                .padding()
            }
            .background(Color.surfaceBackground)
            .navigationTitle(pol.fullName)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            EmptyStateView(title: "Politician not found", message: nil)
        }
    }

    private func profileHeader(_ pol: Politician) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                Circle().fill(Color.cardBorder).frame(width: 56, height: 56)
                    .overlay(Text(String(pol.fullName.prefix(1))).font(.title2).bold().foregroundColor(.textSecondary))
                VStack(alignment: .leading) {
                    Text(pol.fullName).font(.title3).bold()
                    Text("\(pol.partyDisplay) · \(pol.chamber?.capitalized ?? "N/A")")
                        .font(.subheadline).foregroundColor(.textSecondary)
                }
            }
            if let bio = pol.bio { Text(bio).font(.caption) }
            HStack(spacing: 16) {
                if let url = pol.website, let u = URL(string: url) {
                    Link("Website", destination: u).font(.caption)
                }
                if let email = pol.email {
                    Link("Email", destination: URL(string: "mailto:\(email)")!).font(.caption)
                }
                if let phone = pol.phone { Text("Phone: \(phone)").font(.caption).foregroundColor(.textSecondary) }
            }
        }
        .padding().background(Color.white).cornerRadius(12).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))
    }

    private var honestySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Honesty Score").font(.subheadline).fontWeight(.semibold)
            if let score = honesty.score {
                HStack(spacing: 12) {
                    Circle()
                        .fill(score.score >= 70 ? Color.supportGreen : score.score >= 40 ? Color.warningAmber : Color.opposeRed)
                        .frame(width: 56, height: 56)
                        .overlay(Text("\(Int(score.score))").font(.title3).bold().foregroundColor(.white))
                    Text("out of 100").foregroundColor(.textSecondary)
                }
                ForEach(honesty.evidence) { e in
                    VStack(alignment: .leading, spacing: 4) {
                        ChipView(text: e.evidenceType.replacingOccurrences(of: "_", with: " "))
                        Text(e.description).font(.caption)
                    }
                    .padding(8).background(Color.surfaceBackground).cornerRadius(8)
                }
            } else {
                Text("Not yet available.").foregroundColor(.textMuted).font(.callout)
            }
        }
        .padding().background(Color.white).cornerRadius(12).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))
    }

    private var fundingSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Campaign Funding").font(.subheadline).fontWeight(.semibold)
            if let f = funding {
                HStack {
                    VStack { Text("Raised").font(.caption2).foregroundColor(.textMuted); Text("$\(Int(f.totalRaised ?? 0))").font(.headline) }
                    Spacer()
                    VStack { Text("Spent").font(.caption2).foregroundColor(.textMuted); Text("$\(Int(f.totalSpent ?? 0))").font(.headline) }
                    Spacer()
                    VStack { Text("Cycle").font(.caption2).foregroundColor(.textMuted); Text(f.cycle).font(.headline) }
                }
            } else if fundingAvailable {
                Text("Funding data not yet available.").foregroundColor(.textMuted).font(.callout)
            } else {
                Text("Funding data not available for non-federal politicians.").foregroundColor(.textMuted).font(.callout)
            }
        }
        .padding().background(Color.white).cornerRadius(12).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))
    }

    private func reportSection(_ pol: Politician) -> some View {
        Button {
            let subject = "Issue: \(pol.fullName)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            if let url = URL(string: "mailto:?subject=\(subject)") { UIApplication.shared.open(url) }
        } label: {
            Text("Report Issue").font(.subheadline).fontWeight(.semibold)
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.bordered)
    }

    private func load() async {
        politician = try? await service.fetchPolitician(id: politicianId)
        guard let pol = politician else { loading = false; return }
        honesty = await service.fetchHonesty(politicianId: pol.id)
        funding = await service.fetchFunding(politicianId: pol.id)
        if funding == nil { fundingAvailable = await service.isFederal(jurisdictionId: pol.jurisdictionId) }
        loading = false
    }
}
