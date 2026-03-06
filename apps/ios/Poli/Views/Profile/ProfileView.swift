import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var auth: AuthService
    @State private var watchedCategories: [String] = []
    @State private var prefs = NotificationPref(pushEnabled: true, emailEnabled: true, billStatusChange: true, weeklyDigest: false)
    @State private var saving = false

    private let service = NotificationService()
    private let allCategories = [
        "Healthcare", "Education", "Environment", "Defense", "Economy",
        "Immigration", "Technology", "Criminal Justice", "Infrastructure",
        "Civil Rights", "Agriculture", "Energy", "Housing", "Foreign Policy",
        "Labor", "Taxes", "Social Services",
    ]

    var body: some View {
        List {
            accountSection
            categoriesSection
            notificationsSection
            actionsSection
        }
        .navigationTitle("Profile")
        .task { await loadPrefs() }
        .onAppear { watchedCategories = auth.profile?.watchedCategories ?? [] }
    }

    private var accountSection: some View {
        Section("Account") {
            if let email = auth.session?.user.email { Text(email).foregroundColor(.textSecondary) }
            if let addr = auth.address {
                Text("\(addr.city), \(addr.stateCode) \(addr.zip)").font(.caption).foregroundColor(.textMuted)
            }
            if auth.profile?.spectrumScore != nil {
                NavigationLink("Retake Survey", destination: SurveyView())
            }
        }
    }

    private var categoriesSection: some View {
        Section("Watched Categories") {
            FlowLayout(spacing: 6) {
                ForEach(allCategories, id: \.self) { cat in
                    Button(cat) { toggleCategory(cat) }
                        .font(.caption).fontWeight(.medium)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(watchedCategories.contains(cat) ? Color.accentBlue : Color.chipBackground)
                        .foregroundColor(watchedCategories.contains(cat) ? .white : .accentBlue)
                        .cornerRadius(16)
                }
            }
            Button(saving ? "Saving..." : "Save Categories") { saveCategories() }
                .disabled(saving)
        }
    }

    private var notificationsSection: some View {
        Section("Notifications") {
            Toggle("Push Notifications", isOn: $prefs.pushEnabled).onChange(of: prefs.pushEnabled) { _ in updatePrefs() }
            Toggle("Email Notifications", isOn: $prefs.emailEnabled).onChange(of: prefs.emailEnabled) { _ in updatePrefs() }
            Toggle("Bill Status Changes", isOn: $prefs.billStatusChange).onChange(of: prefs.billStatusChange) { _ in updatePrefs() }
            Toggle("Weekly Digest", isOn: $prefs.weeklyDigest).onChange(of: prefs.weeklyDigest) { _ in updatePrefs() }
        }
    }

    private var actionsSection: some View {
        Section {
            Button("Sign Out", role: .destructive) { Task { await auth.signOut() } }
        }
    }

    private func toggleCategory(_ cat: String) {
        if watchedCategories.contains(cat) { watchedCategories.removeAll { $0 == cat } }
        else { watchedCategories.append(cat) }
    }

    private func saveCategories() {
        guard let userId = auth.session?.user.id else { return }
        saving = true
        Task {
            struct Update: Encodable { let watched_categories: [String] }
            try? await SupabaseConfig.client.from("profiles")
                .update(Update(watched_categories: watchedCategories))
                .eq("id", value: userId).execute()
            await auth.refreshProfile()
            saving = false
        }
    }

    private func loadPrefs() async {
        guard let userId = auth.session?.user.id else { return }
        if let p = await service.fetchPrefs(userId: userId) { prefs = p }
    }

    private func updatePrefs() {
        guard let userId = auth.session?.user.id else { return }
        Task { await service.updatePrefs(userId: userId, prefs: prefs) }
    }
}
