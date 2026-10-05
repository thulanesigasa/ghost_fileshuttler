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
    private val binding get() = _binding!!
    private val app by lazy { requireActivity().application as GhostApplication }

    private lateinit var adapter: FileAdapter
    private var pollingJob: Job? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentArchivesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = FileAdapter(
            onDownloadClick = { file -> downloadAndShare(file) },
            onDeleteClick = { file -> promptDelete(file) }
        )

        binding.rvVaultFiles.layoutManager = LinearLayoutManager(requireContext())
        binding.rvVaultFiles.adapter = adapter

        binding.swipeRefresh.setColorSchemeResources(com.ghost.fileshuttler.R.color.ghost_accent)
        binding.swipeRefresh.setOnRefreshListener {
            loadFiles(showLoadingIndicator = false)
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
        pollingJob = viewLifecycleOwner.lifecycleScope.launch {
            loadFiles(showLoadingIndicator = adapter.itemCount == 0)
            while (isActive) {
                delay(2000) // 2-second real-time sync with desktop web vault
                loadFiles(showLoadingIndicator = false)
            }
        }
    }

    fun refreshFiles() {
        loadFiles(showLoadingIndicator = false)
    }

    private fun loadFiles(showLoadingIndicator: Boolean) {
        if (showLoadingIndicator) {
            binding.progressArchives.visibility = View.VISIBLE
        }

        viewLifecycleOwner.lifecycleScope.launch {
            val result = app.apiService.getFiles()
            binding.swipeRefresh.isRefreshing = false
            binding.progressArchives.visibility = View.GONE

            result.onSuccess { files ->
                adapter.submitList(files)
                if (files.isEmpty()) {
                    binding.layoutEmpty.visibility = View.VISIBLE
                    binding.rvVaultFiles.visibility = View.GONE
                } else {
                    binding.layoutEmpty.visibility = View.GONE
                    binding.rvVaultFiles.visibility = View.VISIBLE
                }
            }.onFailure {
                // Graceful fallback during polling
            }
        }
    }

    private fun downloadAndShare(file: VaultFile) {
        Toast.makeText(requireContext(), "Downloading \"${file.filename}\"...", Toast.LENGTH_SHORT).show()

        viewLifecycleOwner.lifecycleScope.launch {
            val destination = File(requireContext().cacheDir, file.filename)
            val result = app.apiService.downloadFile(file.id, destination)

            result.onSuccess { downloadedFile ->
                shareFile(downloadedFile)
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Download failed: ${err.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun shareFile(file: File) {
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
            Toast.makeText(requireContext(), "Failed to open file: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun promptDelete(file: VaultFile) {
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
        viewLifecycleOwner.lifecycleScope.launch {
            val result = app.apiService.deleteFile(file.id)
            result.onSuccess {
                Toast.makeText(requireContext(), "Deleted \"${file.filename}\"", Toast.LENGTH_SHORT).show()
                loadFiles(showLoadingIndicator = false)
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Delete failed: ${err.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
