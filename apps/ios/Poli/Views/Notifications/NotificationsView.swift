import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject var auth: AuthService
    @State private var notifications: [AppNotification] = []
    @State private var loading = true

    private let service = NotificationService()

    var body: some View {
        Group {
            if loading {
                ProgressView("Loading...")
            } else if notifications.isEmpty {
                EmptyStateView(title: "No notifications",
                              message: "Alerts about bill status changes will appear here.")
            } else {
                List(notifications) { notif in
                    Button { markRead(notif) } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(notif.title).font(.subheadline).fontWeight(.semibold)
                                Spacer()
                                if !notif.read {
                                    Circle().fill(Color.accentBlue).frame(width: 8, height: 8)
                                }
                            }
                            Text(notif.body).font(.caption).foregroundColor(.primary)
                            Text(notif.createdAt).font(.caption2).foregroundColor(.textMuted)
                        }
                        .opacity(notif.read ? 0.6 : 1)
                    }
                }
                .listStyle(.plain)
                .refreshable { await load() }
            }
        }
        .navigationTitle("Notifications")
        .task { await load() }
    }

    private func load() async {
        guard let userId = auth.session?.user.id else { return }
        notifications = await service.fetchNotifications(userId: userId)
        loading = false
    }

    private func markRead(_ notif: AppNotification) {
        guard !notif.read else { return }
        Task {
            await service.markRead(notificationId: notif.id)
            if let i = notifications.firstIndex(where: { $0.id == notif.id }) {
                notifications[i].read = true
            }
        }
    }
}
