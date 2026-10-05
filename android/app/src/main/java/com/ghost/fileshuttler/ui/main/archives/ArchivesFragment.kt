package com.ghost.fileshuttler.ui.main.archives

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.ghost.fileshuttler.GhostApplication
import com.ghost.fileshuttler.data.model.VaultFile
import com.ghost.fileshuttler.databinding.FragmentArchivesBinding
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File

class ArchivesFragment : Fragment() {

    private var _binding: FragmentArchivesBinding? = null
    private val binding get() = _binding
    private val app by lazy { requireActivity().application as GhostApplication }

    private lateinit var adapter: FileAdapter
    private var pollingJob: Job? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentArchivesBinding.inflate(inflater, container, false)
        return _binding!!.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = FileAdapter(
            onDownloadClick = { file -> downloadAndShare(file) },
            onDeleteClick = { file -> promptDelete(file) }
        )

        _binding?.let { b ->
            b.rvVaultFiles.layoutManager = LinearLayoutManager(requireContext())
            b.rvVaultFiles.adapter = adapter

            b.swipeRefresh.setColorSchemeResources(com.ghost.fileshuttler.R.color.ghost_accent)
            b.swipeRefresh.setOnRefreshListener {
                loadFiles(showLoadingIndicator = false)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        startRealTimePolling()
    }

    override fun onPause() {
        super.onPause()
        pollingJob?.cancel()
    }

    private fun startRealTimePolling() {
        pollingJob?.cancel()
        if (_binding == null || !isAdded) return

        pollingJob = viewLifecycleOwner.lifecycleScope.launch {
            loadFiles(showLoadingIndicator = adapter.itemCount == 0)
            while (isActive) {
                delay(2000) // 2-second real-time sync with desktop web vault
                if (_binding != null && isAdded) {
                    loadFiles(showLoadingIndicator = false)
                }
            }
        }
    }

    fun refreshFiles() {
        if (_binding != null && isAdded) {
            loadFiles(showLoadingIndicator = false)
        }
    }

    private fun loadFiles(showLoadingIndicator: Boolean) {
        val b = _binding ?: return
        if (!isAdded) return

        if (showLoadingIndicator) {
            b.progressArchives.visibility = View.VISIBLE
        }

        viewLifecycleOwner.lifecycleScope.launch {
            val result = app.apiService.getFiles()
            val currentBinding = _binding ?: return@launch
            currentBinding.swipeRefresh.isRefreshing = false
            currentBinding.progressArchives.visibility = View.GONE

            result.onSuccess { files ->
                val liveBinding = _binding ?: return@onSuccess
                adapter.submitList(files)
                if (files.isEmpty()) {
                    liveBinding.layoutEmpty.visibility = View.VISIBLE
                    liveBinding.rvVaultFiles.visibility = View.GONE
                } else {
                    liveBinding.layoutEmpty.visibility = View.GONE
                    liveBinding.rvVaultFiles.visibility = View.VISIBLE
                }
            }.onFailure {
                // Graceful fallback during polling
            }
        }
    }

    private fun downloadAndShare(file: VaultFile) {
        if (!isAdded) return
        Toast.makeText(requireContext(), "Downloading \"${file.filename}\"...", Toast.LENGTH_SHORT).show()

        viewLifecycleOwner.lifecycleScope.launch {
            val destination = File(requireContext().cacheDir, file.filename)
            val result = app.apiService.downloadFile(file.id, destination)

            result.onSuccess { downloadedFile ->
                shareFile(downloadedFile)
            }.onFailure { err ->
                if (isAdded) {
                    Toast.makeText(requireContext(), "Download failed: ${err.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun shareFile(file: File) {
        if (!isAdded) return
        try {
            val authority = "${requireContext().packageName}.fileprovider"
            val uri = FileProvider.getUriForFile(requireContext(), authority, file)

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = requireContext().contentResolver.getType(uri) ?: "*/*"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(shareIntent, "Share or Save File"))
        } catch (e: Exception) {
            if (isAdded) {
                Toast.makeText(requireContext(), "Failed to open file: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun promptDelete(file: VaultFile) {
        if (!isAdded) return
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Delete File")
            .setMessage("Are you sure you want to remove \"${file.filename}\" from this partition?")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Delete") { _, _ ->
                executeDelete(file)
            }
            .show()
    }

    private fun executeDelete(file: VaultFile) {
        if (!isAdded) return
        viewLifecycleOwner.lifecycleScope.launch {
            val result = app.apiService.deleteFile(file.id)
            result.onSuccess {
                if (isAdded) {
                    Toast.makeText(requireContext(), "Deleted \"${file.filename}\"", Toast.LENGTH_SHORT).show()
                    loadFiles(showLoadingIndicator = false)
                }
            }.onFailure { err ->
                if (isAdded) {
                    Toast.makeText(requireContext(), "Delete failed: ${err.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        pollingJob?.cancel()
        _binding = null
    }
}
