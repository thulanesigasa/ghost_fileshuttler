package com.ghost.fileshuttler.util

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("ghost_vault_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_HOST = "host_ip"
        private const val KEY_PORT = "port"
        private const val KEY_PIN = "vault_pin"
        private const val KEY_COOKIE = "session_cookie"
        const val DEFAULT_HOST = "10.17.178.160"
        const val DEFAULT_PORT = "5000"
    }

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
