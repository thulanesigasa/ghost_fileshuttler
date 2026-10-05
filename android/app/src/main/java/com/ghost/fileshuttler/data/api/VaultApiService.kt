package com.ghost.fileshuttler.data.api

import com.ghost.fileshuttler.data.model.AuthResponse
import com.ghost.fileshuttler.data.model.VaultFile
import com.ghost.fileshuttler.util.SessionManager
import com.ghost.fileshuttler.util.VaultMode
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

class VaultApiService(private val sessionManager: SessionManager) {

    private val gson = Gson()
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()

            // Attach session cookie when connecting via local LAN mode
            if (sessionManager.mode == VaultMode.LAN) {
                sessionManager.sessionCookie?.let { cookie ->
                    requestBuilder.header("Cookie", cookie)
                }
            }

            val response = chain.proceed(requestBuilder.build())
            val setCookie = response.headers("Set-Cookie")
            if (setCookie.isNotEmpty() && sessionManager.mode == VaultMode.LAN) {
                sessionManager.sessionCookie = setCookie.first().substringBefore(";")
            }
            response
        }
        .build()

    suspend fun authenticate(pin: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        if (pin.length != 4 || !pin.all { it.isDigit() }) {
            return@withContext Result.failure(Exception("PIN must be exactly 4 digits."))
        }

        if (sessionManager.mode == VaultMode.CLOUD) {
            // Cloud Mode: PIN represents the secret partition in Supabase Cloud Vault
            sessionManager.pin = pin

            // Lightweight connectivity ping to Supabase Cloud Gateway
            val pingUrl = "${sessionManager.supabaseUrl}/rest/v1/vault_shuttle?limit=1"
            val request = Request.Builder()
                .url(pingUrl)
                .header("apikey", sessionManager.supabaseAnonKey)
                .header("Authorization", "Bearer ${sessionManager.supabaseAnonKey}")
                .get()
                .build()

            try {
                val response = client.newCall(request).execute()
                // Any 2xx or 404 response confirms Cloud server reached
                if (response.isSuccessful || response.code == 404 || response.code == 206) {
                    Result.success(AuthResponse("Connected to Cloud Vault #$pin", pin))
                } else {
                    // Still authenticate locally if credentials are set
                    Result.success(AuthResponse("Paired with Cloud Vault #$pin", pin))
                }
            } catch (e: Exception) {
                // If offline, still accept PIN so files can sync once network reconnects
                Result.success(AuthResponse("Vault #$pin ready (Offline Sync)", pin))
            }
        } else {
            // Local LAN Mode: Authenticate against local Flask instance
            val url = "${sessionManager.baseUrl}/auth"
            val jsonBody = gson.toJson(mapOf("pin" to pin))
            val body = jsonBody.toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())

            val request = Request.Builder()
                .url(url)
                .post(body)
                .build()

            try {
                val response = client.newCall(request).execute()
                val responseString = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    val authRes = gson.fromJson(responseString, AuthResponse::class.java)
                    sessionManager.pin = pin
                    Result.success(authRes)
                } else {
                    val errorRes = try {
                        gson.fromJson(responseString, AuthResponse::class.java)
                    } catch (e: Exception) {
                        null
                    }
                    Result.failure(Exception(errorRes?.error ?: "Authentication rejected (code ${response.code})"))
                }
            } catch (e: Exception) {
                Result.failure(Exception("Cannot connect to LAN vault at ${sessionManager.baseUrl}: ${e.message}"))
            }
        }
    }

    suspend fun getFiles(): Result<List<VaultFile>> = withContext(Dispatchers.IO) {
        val pin = sessionManager.pin ?: return@withContext Result.failure(Exception("Session expired"))

        if (sessionManager.mode == VaultMode.CLOUD) {
            val url = "${sessionManager.supabaseUrl}/rest/v1/vault_shuttle?vault_pin=eq.$pin&order=created_at.desc"
            val request = Request.Builder()
                .url(url)
                .header("apikey", sessionManager.supabaseAnonKey)
                .header("Authorization", "Bearer ${sessionManager.supabaseAnonKey}")
                .get()
                .build()

            try {
                val response = client.newCall(request).execute()
                if (!response.isSuccessful) {
                    if (response.code == 404 || response.code == 400) {
                        // Table may not yet be initialized, return empty list gracefully
                        return@withContext Result.success(emptyList())
                    }
                    return@withContext Result.failure(Exception("Failed to fetch cloud vault files (${response.code})"))
                }

                val json = response.body?.string() ?: "[]"
                val type = object : TypeToken<List<VaultFile>>() {}.type
                val files: List<VaultFile> = gson.fromJson(json, type)
                Result.success(files)
            } catch (e: Exception) {
                Result.failure(e)
            }
        } else {
            val url = "${sessionManager.baseUrl}/files"
            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            try {
                val response = client.newCall(request).execute()
                if (response.code == 401) {
                    sessionManager.pin?.let { storedPin ->
                        val reAuth = authenticate(storedPin)
                        if (reAuth.isSuccess) {
                            return@withContext getFiles()
                        }
                    }
                    return@withContext Result.failure(Exception("Session expired"))
                }

                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("Failed to fetch files (code ${response.code})"))
                }

                val json = response.body?.string() ?: "[]"
                val type = object : TypeToken<List<VaultFile>>() {}.type
                val files: List<VaultFile> = gson.fromJson(json, type)
                Result.success(files)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun uploadFile(
        file: File,
        mimeType: String,
        onProgress: (Int) -> Unit
    ): Result<String> = withContext(Dispatchers.IO) {
        val pin = sessionManager.pin ?: return@withContext Result.failure(Exception("Not authenticated"))

        if (sessionManager.mode == VaultMode.CLOUD) {
            val cleanName = file.name.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
            val storagePath = "$pin/${System.currentTimeMillis()}_$cleanName"
            val storageUrl = "${sessionManager.supabaseUrl}/storage/v1/object/vault_files/$storagePath"

            val mediaType = mimeType.toMediaTypeOrNull() ?: "application/octet-stream".toMediaTypeOrNull()
            val fileBody = file.asRequestBody(mediaType)

            onProgress(25)

            // Step 1: Upload raw binary to Supabase Storage
            val storageRequest = Request.Builder()
                .url(storageUrl)
                .header("apikey", sessionManager.supabaseAnonKey)
                .header("Authorization", "Bearer ${sessionManager.supabaseAnonKey}")
                .header("Content-Type", mimeType)
                .header("x-upsert", "true")
                .post(fileBody)
                .build()

            try {
                val storageResponse = client.newCall(storageRequest).execute()
                if (!storageResponse.isSuccessful) {
                    val err = storageResponse.body?.string() ?: "Storage upload error"
                    return@withContext Result.failure(Exception("Cloud storage upload failed: $err"))
                }

                onProgress(65)

                // Step 2: Register file record in PostgREST table
                val restUrl = "${sessionManager.supabaseUrl}/rest/v1/vault_shuttle"
                val publicUrl = "${sessionManager.supabaseUrl}/storage/v1/object/public/vault_files/$storagePath"

                val metadataMap = mapOf(
                    "vault_pin" to pin,
                    "filename" to file.name,
                    "file_url" to publicUrl,
                    "file_size" to file.length(),
                    "mime_type" to mimeType,
                    "storage_path" to storagePath
                )
                val jsonPayload = gson.toJson(metadataMap)
                val restBody = jsonPayload.toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())

                val restRequest = Request.Builder()
                    .url(restUrl)
                    .header("apikey", sessionManager.supabaseAnonKey)
                    .header("Authorization", "Bearer ${sessionManager.supabaseAnonKey}")
                    .header("Prefer", "return=minimal")
                    .post(restBody)
                    .build()

                val restResponse = client.newCall(restRequest).execute()
                onProgress(100)

                if (restResponse.isSuccessful || restResponse.code == 201) {
                    Result.success("File uploaded to Cloud Vault")
                } else {
                    val err = restResponse.body?.string() ?: "Metadata registration failed"
                    Result.failure(Exception("Cloud metadata registration failed: $err"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        } else {
            // Local LAN Mode: Multipart POST to local Flask server
            val url = "${sessionManager.baseUrl}/upload"
            val mediaType = mimeType.toMediaTypeOrNull() ?: "application/octet-stream".toMediaTypeOrNull()
            val fileBody = file.asRequestBody(mediaType)

            val multipartBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.name, fileBody)
                .build()

            val request = Request.Builder()
                .url(url)
                .post(multipartBody)
                .build()

            try {
                onProgress(30)
                val response = client.newCall(request).execute()
                onProgress(100)

                if (response.isSuccessful) {
                    Result.success("File uploaded successfully")
                } else {
                    val err = response.body?.string() ?: "Upload error"
                    Result.failure(Exception(err))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun downloadFile(file: VaultFile, destinationFile: File): Result<File> = withContext(Dispatchers.IO) {
        if (sessionManager.mode == VaultMode.CLOUD) {
            val downloadUrl = if (!file.fileUrl.isNullOrEmpty()) {
                file.fileUrl
            } else {
                val path = file.storagePath ?: "${sessionManager.pin}/${file.filename}"
                "${sessionManager.supabaseUrl}/storage/v1/object/authenticated/vault_files/$path"
            }

            val request = Request.Builder()
                .url(downloadUrl)
                .header("apikey", sessionManager.supabaseAnonKey)
                .header("Authorization", "Bearer ${sessionManager.supabaseAnonKey}")
                .get()
                .build()

            try {
                val response = client.newCall(request).execute()
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("Download failed with code ${response.code}"))
                }

                val inputStream = response.body?.byteStream() ?: throw IOException("Empty response body")
                val outputStream = FileOutputStream(destinationFile)

                inputStream.use { input ->
                    outputStream.use { output ->
                        input.copyTo(output)
                    }
                }

                Result.success(destinationFile)
            } catch (e: Exception) {
                Result.failure(e)
            }
        } else {
            val url = "${sessionManager.baseUrl}/download/${file.id}"
            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            try {
                val response = client.newCall(request).execute()
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("Download failed with code ${response.code}"))
                }

                val inputStream = response.body?.byteStream() ?: throw IOException("Empty response body")
                val outputStream = FileOutputStream(destinationFile)

                inputStream.use { input ->
                    outputStream.use { output ->
                        input.copyTo(output)
                    }
                }

                Result.success(destinationFile)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun downloadFile(fileId: Int, destinationFile: File): Result<File> {
        val vaultFile = VaultFile(rawId = fileId, filename = destinationFile.name)
        return downloadFile(vaultFile, destinationFile)
    }

    suspend fun deleteFile(file: VaultFile): Result<Boolean> = withContext(Dispatchers.IO) {
        if (sessionManager.mode == VaultMode.CLOUD) {
            // Delete record from PostgREST table
            val restUrl = "${sessionManager.supabaseUrl}/rest/v1/vault_shuttle?id=eq.${file.id}"
            val restRequest = Request.Builder()
                .url(restUrl)
                .header("apikey", sessionManager.supabaseAnonKey)
                .header("Authorization", "Bearer ${sessionManager.supabaseAnonKey}")
                .delete()
                .build()

            try {
                val restResponse = client.newCall(restRequest).execute()

                // Also delete physical object from Supabase Storage if path exists
                file.storagePath?.let { path ->
                    val storageUrl = "${sessionManager.supabaseUrl}/storage/v1/object/vault_files/$path"
                    val storageRequest = Request.Builder()
                        .url(storageUrl)
                        .header("apikey", sessionManager.supabaseAnonKey)
                        .header("Authorization", "Bearer ${sessionManager.supabaseAnonKey}")
                        .delete()
                        .build()
                    try {
                        client.newCall(storageRequest).execute().close()
                    } catch (e: Exception) {
                        // Storage cleanup failure is non-fatal if table record is deleted
                    }
                }

                if (restResponse.isSuccessful || restResponse.code == 204) {
                    Result.success(true)
                } else {
                    Result.failure(Exception("Delete failed with code ${restResponse.code}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        } else {
            val url = "${sessionManager.baseUrl}/delete/${file.id}"
            val request = Request.Builder()
                .url(url)
                .post(ByteArray(0).toRequestBody(null))
                .build()

            try {
                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    Result.failure(Exception("Delete failed with code ${response.code}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun deleteFile(fileId: Int): Result<Boolean> {
        val vaultFile = VaultFile(rawId = fileId)
        return deleteFile(vaultFile)
    }
}
