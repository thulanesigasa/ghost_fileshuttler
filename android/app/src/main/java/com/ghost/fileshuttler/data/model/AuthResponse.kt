package com.ghost.fileshuttler.data.model

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("message") val message: String?,
    @SerializedName("vault_id") val vaultId: String?,
    @SerializedName("error") val error: String?
)
