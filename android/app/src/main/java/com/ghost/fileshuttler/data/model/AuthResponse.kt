package com.ghost.fileshuttler.data.model

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("message") val message: String? = null,
    @SerializedName("vault_id") val vaultId: String? = null,
    @SerializedName("error") val error: String? = null
)
