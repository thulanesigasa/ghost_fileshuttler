package com.ghost.fileshuttler.util

import android.content.Context
import android.content.SharedPreferences

enum class VaultMode {
    CLOUD, // Supabase Cloud Vault (Zero IP configuration, cross-network)
    LAN    // Local Area Network / Self-hosted node
}

class SessionManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("ghost_vault_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_MODE = "vault_mode"
        private const val KEY_SUPABASE_URL = "supabase_url"
        private const val KEY_SUPABASE_ANON_KEY = "supabase_anon_key"
        private const val KEY_HOST = "host_ip"
        private const val KEY_PORT = "port"
        private const val KEY_PIN = "vault_pin"
        private const val KEY_COOKIE = "session_cookie"

        // Production Supabase Cloud Gateway (user configurable)
        const val DEFAULT_SUPABASE_URL = "https://wvhvjovmshgacgqjgtjy.supabase.co"
        const val DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aHZqb3Ztc2hnYWNncWpndGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTgwOTEsImV4cCI6MjA1Njc5NDA5MX0.Z0"

        const val DEFAULT_HOST = "10.17.178.160"
        const val DEFAULT_PORT = "5000"
    }

    var mode: VaultMode
        get() {
            val modeStr = prefs.getString(KEY_MODE, VaultMode.CLOUD.name) ?: VaultMode.CLOUD.name
            return try {
                VaultMode.valueOf(modeStr)
            } catch (e: Exception) {
                VaultMode.CLOUD
            }
        }
        set(value) = prefs.edit().putString(KEY_MODE, value.name).apply()

    var supabaseUrl: String
        get() = prefs.getString(KEY_SUPABASE_URL, DEFAULT_SUPABASE_URL) ?: DEFAULT_SUPABASE_URL
        set(value) = prefs.edit().putString(KEY_SUPABASE_URL, value.trim().removeSuffix("/")).apply()

    var supabaseAnonKey: String
        get() = prefs.getString(KEY_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_ANON_KEY) ?: DEFAULT_SUPABASE_ANON_KEY
        set(value) = prefs.edit().putString(KEY_SUPABASE_ANON_KEY, value.trim()).apply()

    var host: String
        get() = prefs.getString(KEY_HOST, DEFAULT_HOST) ?: DEFAULT_HOST
        set(value) = prefs.edit().putString(KEY_HOST, value.trim()).apply()

    var port: String
        get() = prefs.getString(KEY_PORT, DEFAULT_PORT) ?: DEFAULT_PORT
        set(value) = prefs.edit().putString(KEY_PORT, value.trim()).apply()

    var pin: String?
        get() = prefs.getString(KEY_PIN, null)
        set(value) = prefs.edit().putString(KEY_PIN, value?.trim()).apply()

    var sessionCookie: String?
        get() = prefs.getString(KEY_COOKIE, null)
        set(value) = prefs.edit().putString(KEY_COOKIE, value).apply()

    val baseUrl: String
        get() = "http://$host:$port"

    val isAuthenticated: Boolean
        get() = !pin.isNullOrEmpty() && pin!!.length == 4

    fun clearSession() {
        prefs.edit().remove(KEY_PIN).remove(KEY_COOKIE).apply()
    }
}
