package com.ghost.fileshuttler.data.model

import com.google.gson.annotations.SerializedName

data class VaultFile(
    @SerializedName("id") val rawId: Any? = null,
    @SerializedName("filename") val filename: String = "",
    @SerializedName("uploaded_at") val uploadedAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("file_url") val fileUrl: String? = null,
    @SerializedName("file_size") val fileSize: Long? = null,
    @SerializedName("storage_path") val storagePath: String? = null
) {
    val id: String
        get() = rawId?.toString()?.substringBefore(".") ?: ""

    val fileIdInt: Int
        get() = id.toIntOrNull() ?: 0

    val timestamp: String
        get() = uploadedAt ?: createdAt ?: ""

    fun getFormattedDate(): String {
        val dateStr = timestamp
        return try {
            if (dateStr.contains("T")) {
                val parts = dateStr.split("T")
                val time = parts[1].substringBefore(".")
                "${parts[0]} $time"
            } else {
                dateStr
            }
        } catch (e: Exception) {
            dateStr
        }
    }
}
