import Foundation
import UserNotifications

@MainActor
class NotificationService {
    private let client = SupabaseConfig.client

    func fetchNotifications(userId: UUID) async -> [AppNotification] {
        (try? await client.from("notifications")
            .select().eq("user_id", value: userId)
            .order("created_at", ascending: false).limit(50).execute().value) ?? []
    }

    func markRead(notificationId: UUID) async {
        struct Update: Encodable { let read: Bool }
        try? await client.from("notifications")
            .update(Update(read: true)).eq("id", value: notificationId).execute()
    }

    func fetchPrefs(userId: UUID) async -> NotificationPref? {
        try? await client.from("user_notification_prefs")
            .select().eq("user_id", value: userId).single().execute().value
    }

    func updatePrefs(userId: UUID, prefs: NotificationPref) async {
        try? await client.from("user_notification_prefs")
            .update(prefs).eq("user_id", value: userId).execute()
    }

    func requestPushPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = try? await center.requestAuthorization(options: [.alert, .badge, .sound])
        return granted ?? false
    }
}
