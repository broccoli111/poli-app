import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        Group {
            if auth.isLoading {
                ProgressView("Loading...")
            } else if auth.session == nil {
                AuthView()
            } else if auth.address == nil {
                OnboardingView()
            } else {
                MainTabView()
            }
        }
        .task {
            await auth.initialize()
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                BillFeedView()
            }
            .tabItem { Label("Bills", systemImage: "doc.text") }

            NavigationStack {
                SurveyView()
            }
            .tabItem { Label("Survey", systemImage: "chart.bar") }

            NavigationStack {
                NotificationsView()
            }
            .tabItem { Label("Alerts", systemImage: "bell") }

            NavigationStack {
                ProfileView()
            }
            .tabItem { Label("Profile", systemImage: "person") }
        }
        .tint(Color.accentBlue)
    }
}
