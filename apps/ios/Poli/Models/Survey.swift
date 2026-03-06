import Foundation

struct SurveyQuestion: Identifiable {
    let id: String
    let text: String
    let weights: [String: Double]
}

enum SurveyAnswer: String, CaseIterable {
    case agree, neutral, disagree

    var display: String { rawValue.capitalized }
}

enum SurveyData {
    static let questions: [SurveyQuestion] = [
        .init(id: "q1", text: "The government should provide universal healthcare coverage for all citizens.",
              weights: ["democrat": 2, "republican": -2, "libertarian": -1, "green": 2, "independent": 0]),
        .init(id: "q2", text: "Lower taxes are more important than increased public services.",
              weights: ["democrat": -2, "republican": 2, "libertarian": 2, "green": -2, "independent": 0]),
        .init(id: "q3", text: "Climate change legislation should be a top government priority.",
              weights: ["democrat": 2, "republican": -1, "libertarian": -1, "green": 3, "independent": 0]),
        .init(id: "q4", text: "Gun ownership rights should be protected with minimal restrictions.",
              weights: ["democrat": -2, "republican": 2, "libertarian": 3, "green": -2, "independent": 0]),
        .init(id: "q5", text: "Immigration policy should prioritize a path to citizenship for undocumented residents.",
              weights: ["democrat": 2, "republican": -2, "libertarian": 0, "green": 1, "independent": 0]),
        .init(id: "q6", text: "The government should regulate large technology companies more strictly.",
              weights: ["democrat": 1, "republican": 0, "libertarian": -2, "green": 2, "independent": 1]),
        .init(id: "q7", text: "Military spending should be increased to ensure national security.",
              weights: ["democrat": -1, "republican": 2, "libertarian": -2, "green": -2, "independent": 0]),
        .init(id: "q8", text: "Public education funding should be significantly increased.",
              weights: ["democrat": 2, "republican": -1, "libertarian": -1, "green": 2, "independent": 1]),
        .init(id: "q9", text: "Marijuana should be fully legalized at the federal level.",
              weights: ["democrat": 1, "republican": -1, "libertarian": 3, "green": 2, "independent": 1]),
        .init(id: "q10", text: "Corporations have too much influence in politics and elections.",
              weights: ["democrat": 2, "republican": 0, "libertarian": 1, "green": 3, "independent": 2]),
    ]

    static func computeScores(answers: [String: SurveyAnswer]) -> (spectrumScore: Double, alignmentRadar: [String: Double]) {
        let parties = ["democrat", "republican", "libertarian", "green", "independent"]
        var partyScores = Dictionary(uniqueKeysWithValues: parties.map { ($0, 0.0) })
        var maxPossible = Dictionary(uniqueKeysWithValues: parties.map { ($0, 0.0) })

        for q in questions {
            let multiplier: Double = {
                switch answers[q.id] {
                case .agree: return 1
                case .disagree: return -1
                default: return 0
                }
            }()

            for (party, weight) in q.weights {
                partyScores[party, default: 0] += weight * multiplier
                maxPossible[party, default: 0] += abs(weight)
            }
        }

        var radar: [String: Double] = [:]
        for party in parties {
            let max = max(maxPossible[party] ?? 1, 1)
            radar[party] = ((partyScores[party]! + max) / (2 * max)) * 100
        }

        let leftScore = (partyScores["democrat"]! + partyScores["green"]!) / 2
        let rightScore = (partyScores["republican"]! + partyScores["libertarian"]!) / 2
        let maxLeft = (maxPossible["democrat"]! + maxPossible["green"]!) / 2
        let maxRight = (maxPossible["republican"]! + maxPossible["libertarian"]!) / 2
        let maxRange = Swift.max(maxLeft, maxRight, 1)
        let raw = rightScore - leftScore
        let spectrum = ((raw + maxRange) / (2 * maxRange)) * 100

        return (min(100, max(0, spectrum.rounded())), radar.mapValues { $0.rounded() })
    }
}
