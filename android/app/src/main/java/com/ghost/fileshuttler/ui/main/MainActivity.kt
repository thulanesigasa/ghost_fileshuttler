package com.ghost.fileshuttler.ui.main

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.ghost.fileshuttler.GhostApplication
import com.ghost.fileshuttler.R
import com.ghost.fileshuttler.databinding.ActivityMainBinding
import com.ghost.fileshuttler.ui.auth.AuthActivity
import com.ghost.fileshuttler.ui.main.archives.ArchivesFragment
import com.ghost.fileshuttler.ui.main.upload.UploadFragment

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val app by lazy { application as GhostApplication }

    private val uploadFragment by lazy {
        UploadFragment().apply {
            onUploadCompleted = {
                selectTab(TabType.ARCHIVES)
            }
        }
    }
    private val archivesFragment by lazy { ArchivesFragment() }

    private enum class TabType {
        UPLOAD, ARCHIVES
    }

    private var currentTab = TabType.UPLOAD

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Session check
        if (!app.sessionManager.isAuthenticated) {
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupHeader()
        setupBottomTabBar()

        // Default to Upload tab
        if (savedInstanceState == null) {
            selectTab(TabType.UPLOAD)
        }
    }

    private fun setupHeader() {
        val pin = app.sessionManager.pin ?: "----"
        binding.tvPinPill.text = "PIN: $pin"

        binding.btnLock.setOnClickListener {
            app.sessionManager.clearSession()
            val intent = Intent(this, AuthActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }

    private fun setupBottomTabBar() {
        binding.tabUpload.setOnClickListener {
            if (currentTab != TabType.UPLOAD) {
                selectTab(TabType.UPLOAD)
            }
        }

        binding.tabArchives.setOnClickListener {
            if (currentTab != TabType.ARCHIVES) {
                selectTab(TabType.ARCHIVES)
            }
        }
    }

    private fun selectTab(tab: TabType) {
        currentTab = tab

        val accentColor = ContextCompat.getColor(this, R.color.ghost_accent)
        val inactiveColor = ContextCompat.getColor(this, R.color.ghost_text_secondary)

        when (tab) {
            TabType.UPLOAD -> {
                // Highlight Upload tab
                binding.iconUpload.imageTintList = ColorStateList.valueOf(accentColor)
                binding.labelUpload.setTextColor(accentColor)
                binding.dotUpload.visibility = View.VISIBLE

                // Dim Archives tab
                binding.iconArchives.imageTintList = ColorStateList.valueOf(inactiveColor)
                binding.labelArchives.setTextColor(inactiveColor)
                binding.dotArchives.visibility = View.INVISIBLE

                replaceFragment(uploadFragment)
            }
            TabType.ARCHIVES -> {
                // Highlight Archives tab
                binding.iconArchives.imageTintList = ColorStateList.valueOf(accentColor)
                binding.labelArchives.setTextColor(accentColor)
                binding.dotArchives.visibility = View.VISIBLE

                // Dim Upload tab
                binding.iconUpload.imageTintList = ColorStateList.valueOf(inactiveColor)
                binding.labelUpload.setTextColor(inactiveColor)
                binding.dotUpload.visibility = View.INVISIBLE

                replaceFragment(archivesFragment)
            }
        }
    }

    private fun replaceFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commitAllowingStateLoss()
    }
}
