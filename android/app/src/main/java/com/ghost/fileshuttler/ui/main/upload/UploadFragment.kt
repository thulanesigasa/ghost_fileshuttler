package com.ghost.fileshuttler.ui.main.upload

import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.ghost.fileshuttler.GhostApplication
import com.ghost.fileshuttler.databinding.FragmentUploadBinding
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

class UploadFragment : Fragment() {

    private var _binding: FragmentUploadBinding? = null
    private val binding get() = _binding!!
    private val app by lazy { requireActivity().application as GhostApplication }

    private var selectedFile: File? = null
    private var selectedFileName: String? = null
    private var selectedMimeType: String? = null
    private var isUploading = false

    var onUploadCompleted: (() -> Unit)? = null

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { handleSelectedUri(it) }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentUploadBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.layoutDropzone.setOnClickListener {
            if (!isUploading) {
                filePickerLauncher.launch("*/*")
            }
        }

        binding.btnRemoveSelectedFile.setOnClickListener {
            clearSelectedFile()
        }

        binding.btnShuttleUpload.setOnClickListener {
            uploadCurrentFile()
        }
    }

    private fun handleSelectedUri(uri: Uri) {
        try {
            var fileName = "shuttle_file"
            var fileSize = 0L

            requireContext().contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (cursor.moveToFirst()) {
                    if (nameIndex != -1) fileName = cursor.getString(nameIndex)
                    if (sizeIndex != -1) fileSize = cursor.getLong(sizeIndex)
                }
            }

            val mimeType = requireContext().contentResolver.getType(uri) ?: "application/octet-stream"

            // Copy content stream to cache file
            val tempFile = File(requireContext().cacheDir, fileName)
            requireContext().contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }

            selectedFile = tempFile
            selectedFileName = fileName
            selectedMimeType = mimeType

            binding.tvSelectedFileName.text = fileName
            binding.tvSelectedFileSize.text = formatFileSize(fileSize)
            binding.cardSelectedFile.visibility = View.VISIBLE
            binding.tvDropzoneTitle.text = "Change Selected File"
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Failed to read file: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun clearSelectedFile() {
        selectedFile = null
        selectedFileName = null
        selectedMimeType = null
        binding.cardSelectedFile.visibility = View.GONE
        binding.tvDropzoneTitle.text = getString(com.ghost.fileshuttler.R.string.dropzone_title)
        binding.progressUpload.visibility = View.GONE
    }

    private fun uploadCurrentFile() {
        val file = selectedFile ?: return
        val mime = selectedMimeType ?: "application/octet-stream"

        isUploading = true
        binding.progressUpload.visibility = View.VISIBLE
        binding.btnShuttleUpload.isEnabled = false

        lifecycleScope.launch {
            val result = app.apiService.uploadFile(file, mime) { progressPercent ->
                binding.progressUpload.progress = progressPercent
            }

            isUploading = false
            binding.progressUpload.visibility = View.GONE
            binding.btnShuttleUpload.isEnabled = true

            result.onSuccess {
                Toast.makeText(requireContext(), "Transferred \"$selectedFileName\" to vault!", Toast.LENGTH_SHORT).show()
                clearSelectedFile()
                onUploadCompleted?.invoke()
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Upload failed: ${err.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun formatFileSize(size: Long): String {
        if (size <= 0) return "0 B"
        val units = arrayOf("B", "KB", "MB", "GB", "TB")
        val digitGroups = (Math.log10(size.toDouble()) / Math.log10(1024.0)).toInt()
        return String.format("%.1f %s", size / Math.pow(1024.0, digitGroups.toDouble()), units[digitGroups])
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
