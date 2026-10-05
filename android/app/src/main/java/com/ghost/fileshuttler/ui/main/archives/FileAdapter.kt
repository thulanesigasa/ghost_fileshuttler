package com.ghost.fileshuttler.ui.main.archives

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.ghost.fileshuttler.R
import com.ghost.fileshuttler.data.model.VaultFile
import com.ghost.fileshuttler.databinding.ItemVaultFileBinding

class FileAdapter(
    private val onDownloadClick: (VaultFile) -> Unit,
    private val onDeleteClick: (VaultFile) -> Unit
) : ListAdapter<VaultFile, FileAdapter.FileViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FileViewHolder {
        val binding = ItemVaultFileBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return FileViewHolder(binding)
    }

    override fun onBindViewHolder(holder: FileViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class FileViewHolder(private val binding: ItemVaultFileBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(file: VaultFile) {
            binding.tvFileName.text = file.filename
            binding.tvFileMeta.text = "Uploaded ${file.getFormattedDate()}"

            // Determine appropriate vector icon based on extension
            val ext = file.filename.substringAfterLast(".", "").lowercase()
            when (ext) {
                "pdf", "doc", "docx", "txt", "md" -> binding.imgFileIcon.setImageResource(R.drawable.ic_file)
                "zip", "tar", "gz", "7z", "rar" -> binding.imgFileIcon.setImageResource(R.drawable.ic_folder_archive)
                else -> binding.imgFileIcon.setImageResource(R.drawable.ic_file)
            }

            binding.btnDownload.setOnClickListener { onDownloadClick(file) }
            binding.btnDelete.setOnClickListener { onDeleteClick(file) }
        }
    }

    companion object DiffCallback : DiffUtil.ItemCallback<VaultFile>() {
        override fun areItemsTheSame(oldItem: VaultFile, newItem: VaultFile): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: VaultFile, newItem: VaultFile): Boolean {
            return oldItem == newItem
        }
    }
}
