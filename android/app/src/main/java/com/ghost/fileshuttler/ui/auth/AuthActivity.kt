package com.ghost.fileshuttler.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ghost.fileshuttler.GhostApplication
import com.ghost.fileshuttler.R
import com.ghost.fileshuttler.databinding.ActivityAuthBinding
import com.ghost.fileshuttler.ui.main.MainActivity
import com.ghost.fileshuttler.util.VaultMode
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch

class AuthActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAuthBinding
    private val app by lazy { application as GhostApplication }
    private val currentPin = StringBuilder()
    private var isAuthenticating = false

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_GhostFileShuttler)
        super.onCreate(savedInstanceState)

        // If session is already authenticated, jump directly to vault
        if (app.sessionManager.isAuthenticated) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        binding = ActivityAuthBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupKeypad()
        updateServerTargetText()
        binding.btnServerConfig.setOnClickListener { showServerConfigDialog() }
    }

    private fun updateServerTargetText() {
        if (app.sessionManager.mode == VaultMode.CLOUD) {
            binding.imgServerModeIcon.setImageResource(R.drawable.ic_cloud)
            binding.tvServerTarget.text = "Mode: Cloud Vault (Global Sync)"
        } else {
            binding.imgServerModeIcon.setImageResource(R.drawable.ic_server)
            binding.tvServerTarget.text = "LAN: ${app.sessionManager.baseUrl}"
        }
    }

    private fun setupKeypad() {
        val numberButtons = listOf(
            binding.btn0, binding.btn1, binding.btn2, binding.btn3, binding.btn4,
            binding.btn5, binding.btn6, binding.btn7, binding.btn8, binding.btn9
        )

        numberButtons.forEach { btn ->
            btn.setOnClickListener {
                if (isAuthenticating) return@setOnClickListener
                if (currentPin.length < 4) {
                    currentPin.append(btn.text)
                    updatePinDots()
                    if (currentPin.length == 4) {
                        performAuthentication()
                    }
                }
            }
        }

        binding.btnClr.setOnClickListener {
            if (isAuthenticating) return@setOnClickListener
            currentPin.clear()
            updatePinDots()
        }

        binding.btnDel.setOnClickListener {
            if (isAuthenticating) return@setOnClickListener
            if (currentPin.isNotEmpty()) {
                currentPin.deleteCharAt(currentPin.length - 1)
                updatePinDots()
            }
        }
    }

    private fun updatePinDots() {
        val dots = listOf(binding.dot1, binding.dot2, binding.dot3, binding.dot4)
        for (i in dots.indices) {
            if (i < currentPin.length) {
                dots[i].setBackgroundResource(R.drawable.bg_pin_dot_filled)
            } else {
                dots[i].setBackgroundResource(R.drawable.bg_pin_dot_empty)
            }
        }
    }

    private fun performAuthentication() {
        val pin = currentPin.toString()
        isAuthenticating = true
        binding.progressAuth.visibility = View.VISIBLE

        lifecycleScope.launch {
            val result = app.apiService.authenticate(pin)
            binding.progressAuth.visibility = View.GONE
            isAuthenticating = false

            result.onSuccess {
                Toast.makeText(this@AuthActivity, "Access Granted to Vault #$pin", Toast.LENGTH_SHORT).show()
                val intent = Intent(this@AuthActivity, MainActivity::class.java)
                startActivity(intent)
                finish()
            }.onFailure { error ->
                currentPin.clear()
                updatePinDots()
                MaterialAlertDialogBuilder(this@AuthActivity)
                    .setTitle("Authentication Error")
                    .setMessage(error.message ?: "Could not connect to vault.")
                    .setPositiveButton("Retry", null)
                    .show()
            }
        }
    }

    private fun showServerConfigDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_server_config, null)
        val rgMode = dialogView.findViewById<RadioGroup>(R.id.rgMode)
        val rbModeCloud = dialogView.findViewById<RadioButton>(R.id.rbModeCloud)
        val rbModeLan = dialogView.findViewById<RadioButton>(R.id.rbModeLan)

        val layoutCloudConfig = dialogView.findViewById<LinearLayout>(R.id.layoutCloudConfig)
        val etSupabaseUrl = dialogView.findViewById<EditText>(R.id.etSupabaseUrl)
        val etSupabaseKey = dialogView.findViewById<EditText>(R.id.etSupabaseKey)

        val layoutLanConfig = dialogView.findViewById<LinearLayout>(R.id.layoutLanConfig)
        val etHost = dialogView.findViewById<EditText>(R.id.etHostIp)
        val etPort = dialogView.findViewById<EditText>(R.id.etPort)

        val btnCancel = dialogView.findViewById<Button>(R.id.btnCancel)
        val btnSave = dialogView.findViewById<Button>(R.id.btnSave)

        // Initialize values from session
        val currentMode = app.sessionManager.mode
        if (currentMode == VaultMode.CLOUD) {
            rbModeCloud.isChecked = true
            layoutCloudConfig.visibility = View.VISIBLE
            layoutLanConfig.visibility = View.GONE
        } else {
            rbModeLan.isChecked = true
            layoutCloudConfig.visibility = View.GONE
            layoutLanConfig.visibility = View.VISIBLE
        }

        etSupabaseUrl.setText(app.sessionManager.supabaseUrl)
        etSupabaseKey.setText(app.sessionManager.supabaseAnonKey)
        etHost.setText(app.sessionManager.host)
        etPort.setText(app.sessionManager.port)

        rgMode.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.rbModeCloud) {
                layoutCloudConfig.visibility = View.VISIBLE
                layoutLanConfig.visibility = View.GONE
            } else {
                layoutCloudConfig.visibility = View.GONE
                layoutLanConfig.visibility = View.VISIBLE
            }
        }

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()

        btnCancel.setOnClickListener { dialog.dismiss() }
        btnSave.setOnClickListener {
            val selectedMode = if (rbModeCloud.isChecked) VaultMode.CLOUD else VaultMode.LAN
            app.sessionManager.mode = selectedMode

            val newCloudUrl = etSupabaseUrl.text.toString().trim()
            val newCloudKey = etSupabaseKey.text.toString().trim()
            if (newCloudUrl.isNotEmpty()) app.sessionManager.supabaseUrl = newCloudUrl
            if (newCloudKey.isNotEmpty()) app.sessionManager.supabaseAnonKey = newCloudKey

            val newHost = etHost.text.toString().trim()
            val newPort = etPort.text.toString().trim()
            if (newHost.isNotEmpty()) app.sessionManager.host = newHost
            if (newPort.isNotEmpty()) app.sessionManager.port = newPort

            updateServerTargetText()
            dialog.dismiss()
            Toast.makeText(this, "Connection configuration saved", Toast.LENGTH_SHORT).show()
        }

        dialog.show()
    }
}
