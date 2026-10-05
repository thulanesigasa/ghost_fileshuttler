package com.ghost.fileshuttler.data.model

import com.google.gson.annotations.SerializedName

data class VaultFile(
    @SerializedName("id") val id: Int,
    @SerializedName("filename") val filename: String,
    @SerializedName("uploaded_at") val uploadedAt: String
) {
    fun getFormattedDate(): String {
        return try {
            if (uploadedAt.contains("T")) {
                val parts = uploadedAt.split("T")
                val time = parts[1].substringBefore(".")
                "${parts[0]} $time"
            } else {
                uploadedAt
            }
        } catch (e: Exception) {
            uploadedAt
        }
    }
}
