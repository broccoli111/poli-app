import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @EnvironmentObject var auth: AuthService
    @State private var mode: AuthMode = .signIn
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var message = ""
    @State private var isError = false

    enum AuthMode: String, CaseIterable {
        case signIn = "Sign In"
        case signUp = "Sign Up"
        case magic = "Magic Link"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Poli")
                    .font(.largeTitle).bold()
                    .foregroundColor(.accentBlue)
                    .padding(.top, 60)

                Picker("Mode", selection: $mode) {
                    ForEach(AuthMode.allCases, id: \.self) { m in
                        Text(m.rawValue).tag(m)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                VStack(spacing: 12) {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textFieldStyle(.roundedBorder)

                    if mode != .magic {
                        SecureField("Password", text: $password)
                            .textContentType(mode == .signUp ? .newPassword : .password)
                            .textFieldStyle(.roundedBorder)
                    }
                }
                .padding(.horizontal)

                if !message.isEmpty {
                    Text(message)
                        .font(.caption)
                        .foregroundColor(isError ? .red : .green)
                        .padding(.horizontal)
                }

                Button(action: handleSubmit) {
                    if loading {
                        ProgressView().tint(.white)
                    } else {
                        Text(mode == .signUp ? "Create Account" : mode == .magic ? "Send Magic Link" : "Sign In")
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(Color.accentBlue)
                .foregroundColor(.white)
                .font(.headline)
                .cornerRadius(10)
                .disabled(loading)
                .padding(.horizontal)

                Text("Or continue with")
                    .font(.caption)
                    .foregroundColor(.textMuted)

                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.email, .fullName]
                } onCompletion: { result in
                    handleApple(result)
                }
                .frame(height: 48)
                .cornerRadius(10)
                .padding(.horizontal)
            }
        }
        .background(Color.surfaceBackground)
    }

    private func handleSubmit() {
        loading = true
        message = ""
        Task {
            do {
                switch mode {
                case .signIn:
                    try await auth.signInWithEmail(email: email, password: password)
                case .signUp:
                    try await auth.signUpWithEmail(email: email, password: password)
                    message = "Check your email to confirm your account."
                    isError = false
                case .magic:
                    try await auth.signInWithMagicLink(email: email)
                    message = "Check your email for the magic link!"
                    isError = false
                }
            } catch {
                message = error.localizedDescription
                isError = true
            }
            loading = false
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8) else { return }
            Task {
                do {
                    try await self.auth.signInWithApple(idToken: idToken, nonce: "")
                } catch {
                    message = error.localizedDescription
                    isError = true
                }
            }
        case .failure(let error):
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                message = error.localizedDescription
                isError = true
            }
        }
    }
}
