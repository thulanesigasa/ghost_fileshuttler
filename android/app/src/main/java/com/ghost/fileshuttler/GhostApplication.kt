package com.ghost.fileshuttler

import android.app.Application
import com.ghost.fileshuttler.data.api.VaultApiService
import com.ghost.fileshuttler.util.SessionManager

class GhostApplication : Application() {

    lateinit var sessionManager: SessionManager
        private set

    lateinit var apiService: VaultApiService
        private set

    override fun onCreate() {
        super.onCreate()
        sessionManager = SessionManager(this)
        apiService = VaultApiService(sessionManager)
    }
}
