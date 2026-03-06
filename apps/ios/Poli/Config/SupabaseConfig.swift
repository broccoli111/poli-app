import Foundation
import Supabase

enum SupabaseConfig {
    static let url = URL(string: "https://cywzijedttqyqjtiexal.supabase.co")!
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5d3ppamVkdHRxeXFqdGlleGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTg5OTAsImV4cCI6MjA4Nzg3NDk5MH0.LkTQzZaSnQsn2t4HTsGuVlJYkdskXSDXXebD0xgG2zc"

    static let client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
}
