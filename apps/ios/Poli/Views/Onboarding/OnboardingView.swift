import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var auth: AuthService
    @State private var line1 = ""
    @State private var city = ""
    @State private var stateCode = ""
    @State private var zip = ""
    @State private var loading = false
    @State private var error = ""

    private let states = [
        "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
        "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
        "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
        "VA","WA","WV","WI","WY","DC"
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Welcome to Poli")
                    .font(.title).bold()

                Text("We need your address to show relevant bills and representatives for your area.")
                    .foregroundColor(.textSecondary)

                VStack(spacing: 12) {
                    TextField("Street Address", text: $line1)
                        .textFieldStyle(.roundedBorder)

                    TextField("City", text: $city)
                        .textFieldStyle(.roundedBorder)

                    HStack {
                        Picker("State", selection: $stateCode) {
                            Text("State").tag("")
                            ForEach(states, id: \.self) { s in
                                Text(s).tag(s)
                            }
                        }
                        .pickerStyle(.menu)

                        TextField("ZIP Code", text: $zip)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                if !error.isEmpty {
                    Text(error).font(.caption).foregroundColor(.red)
                }

                Button(action: save) {
                    if loading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Save & Continue")
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(canSave ? Color.accentBlue : Color.gray)
                .foregroundColor(.white)
                .font(.headline)
                .cornerRadius(10)
                .disabled(!canSave || loading)
            }
            .padding()
        }
        .background(Color.surfaceBackground)
    }

    private var canSave: Bool {
        !line1.isEmpty && !city.isEmpty && !stateCode.isEmpty && zip.count >= 5
    }

    private func save() {
        loading = true
        error = ""
        Task {
            do {
                try await auth.saveAddress(line1: line1, city: city, stateCode: stateCode, zip: zip)
            } catch {
                self.error = error.localizedDescription
            }
            loading = false
        }
    }
}
