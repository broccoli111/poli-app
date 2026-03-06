import SwiftUI

struct SurveyView: View {
    @EnvironmentObject var auth: AuthService
    @State private var answers: [String: SurveyAnswer] = [:]
    @State private var results: (spectrumScore: Double, alignmentRadar: [String: Double])?
    @State private var loading = false

    private var allAnswered: Bool {
        SurveyData.questions.allSatisfy { answers[$0.id] != nil }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let results {
                    resultsView(results)
                } else {
                    questionsView
                }
            }
            .padding()
        }
        .background(Color.surfaceBackground)
        .navigationTitle("Policy Survey")
    }

    private var questionsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Answer 10 questions to discover your alignment.")
                .foregroundColor(.textSecondary)

            ForEach(Array(SurveyData.questions.enumerated()), id: \.element.id) { index, q in
                VStack(alignment: .leading, spacing: 8) {
                    Text("Question \(index + 1)").font(.caption).foregroundColor(.textMuted)
                    Text(q.text).font(.subheadline)
                    HStack(spacing: 8) {
                        ForEach(SurveyAnswer.allCases, id: \.self) { a in
                            Button(a.display) { answers[q.id] = a }
                                .font(.caption).fontWeight(.medium)
                                .frame(maxWidth: .infinity, minHeight: 36)
                                .background(answers[q.id] == a ? Color.accentBlue : Color.clear)
                                .foregroundColor(answers[q.id] == a ? .white : .accentBlue)
                                .cornerRadius(8)
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.accentBlue))
                        }
                    }
                }
                .padding()
                .background(Color.white)
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))
            }

            Button(action: submit) {
                if loading { ProgressView().tint(.white) }
                else { Text("See Results") }
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(allAnswered ? Color.accentBlue : Color.gray)
            .foregroundColor(.white).font(.headline).cornerRadius(10)
            .disabled(!allAnswered || loading)
        }
    }

    private func resultsView(_ r: (spectrumScore: Double, alignmentRadar: [String: Double])) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Your Results").font(.title2).bold()

            VStack(alignment: .leading, spacing: 8) {
                Text("Political Spectrum").font(.subheadline).fontWeight(.semibold)
                SpectrumBarView(score: r.spectrumScore)
            }
            .padding().background(Color.white).cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))

            VStack(alignment: .leading, spacing: 8) {
                Text("Party Alignment").font(.subheadline).fontWeight(.semibold)
                ForEach(r.alignmentRadar.sorted(by: { $0.key < $1.key }), id: \.key) { party, value in
                    HStack {
                        Text(party.capitalized).font(.caption).frame(width: 90, alignment: .leading)
                        GeometryReader { geo in
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.accentBlue)
                                .frame(width: geo.size.width * value / 100)
                        }.frame(height: 16)
                        Text("\(Int(value))%").font(.caption2).foregroundColor(.textSecondary).frame(width: 35)
                    }
                }
            }
            .padding().background(Color.white).cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder))

            Button("Retake Survey") {
                results = nil
                answers = [:]
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(Color.accentBlue).foregroundColor(.white).font(.headline).cornerRadius(10)
        }
    }

    private func submit() {
        guard let userId = auth.session?.user.id else { return }
        loading = true
        let scores = SurveyData.computeScores(answers: answers)
        results = scores

        Task {
            let answersStrings = answers.mapValues { $0.rawValue }
            let row = SurveyResponseRow(
                userId: userId, responses: answersStrings,
                spectrumScore: scores.spectrumScore, alignmentRadar: scores.alignmentRadar
            )
            try? await SupabaseConfig.client.from("survey_responses").insert(row).execute()

            struct ProfileUpdate: Encodable {
                let spectrum_score: Double
                let alignment_radar: [String: Double]
            }
            try? await SupabaseConfig.client.from("profiles")
                .update(ProfileUpdate(spectrum_score: scores.spectrumScore, alignment_radar: scores.alignmentRadar))
                .eq("id", value: userId).execute()

            await auth.refreshProfile()
            loading = false
        }
    }
}
