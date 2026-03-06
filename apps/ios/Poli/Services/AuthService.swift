import Foundation
import Supabase
import AuthenticationServices

@MainActor
class AuthService: ObservableObject {
    @Published var session: Session?
    @Published var profile: Profile?
    @Published var address: Address?
    @Published var isLoading = true

    private let client = SupabaseConfig.client

    func initialize() async {
        do {
            session = try await client.auth.session
            if let userId = session?.user.id {
                await loadUserData(userId: userId)
            }
        } catch {
            session = nil
        }
        isLoading = false

        for await (event, session) in client.auth.authStateChanges {
            self.session = session
            if let userId = session?.user.id {
                await loadUserData(userId: userId)
            } else {
                profile = nil
                address = nil
            }
        }
    }

    private func loadUserData(userId: UUID) async {
        await ensureProfile(userId: userId)
        await loadAddress(userId: userId)
        await ensureNotificationPrefs(userId: userId)
    }

    func signInWithEmail(email: String, password: String) async throws {
        let result = try await client.auth.signIn(email: email, password: password)
        session = result.session
    }

    func signUpWithEmail(email: String, password: String) async throws {
        try await client.auth.signUp(email: email, password: password)
    }

    func signInWithMagicLink(email: String) async throws {
        try await client.auth.signInWithOTP(email: email)
    }

    func signInWithApple(idToken: String, nonce: String) async throws {
        let result = try await client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
        )
        session = result.session
    }

    func signOut() async {
        try? await client.auth.signOut()
        session = nil
        profile = nil
        address = nil
    }

    func saveAddress(line1: String, city: String, stateCode: String, zip: String) async throws {
        guard let userId = session?.user.id else { return }

        struct AddressInsert: Encodable {
            let user_id: UUID
            let line1: String
            let city: String
            let state_code: String
            let zip: String
            let is_primary: Bool
            let federal_house: String
        }

        try await client.from("addresses").insert(
            AddressInsert(
                user_id: userId, line1: line1, city: city,
                state_code: stateCode, zip: zip, is_primary: true, federal_house: "at-large"
            )
        ).execute()

        await loadAddress(userId: userId)
    }

    func refreshProfile() async {
        guard let userId = session?.user.id else { return }
        profile = try? await client.from("profiles")
            .select().eq("id", value: userId).single().execute().value
    }

    private func ensureProfile(userId: UUID) async {
        let existing: Profile? = try? await client.from("profiles")
            .select().eq("id", value: userId).single().execute().value

        if existing == nil {
            struct ProfileInsert: Encodable {
                let id: UUID
                let watched_categories: [String]
            }
            try? await client.from("profiles").insert(
                ProfileInsert(id: userId, watched_categories: [])
            ).execute()
        }

        profile = try? await client.from("profiles")
            .select().eq("id", value: userId).single().execute().value
    }

    private func loadAddress(userId: UUID) async {
        address = try? await client.from("addresses")
            .select().eq("user_id", value: userId).eq("is_primary", value: true)
            .single().execute().value
    }

    private func ensureNotificationPrefs(userId: UUID) async {
        struct PrefCheck: Decodable { let id: UUID }
        let existing: PrefCheck? = try? await client.from("user_notification_prefs")
            .select("id").eq("user_id", value: userId).single().execute().value

        if existing == nil {
            struct PrefInsert: Encodable { let user_id: UUID }
            try? await client.from("user_notification_prefs")
                .insert(PrefInsert(user_id: userId)).execute()
        }
    }
}
