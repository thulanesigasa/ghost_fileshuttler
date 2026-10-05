package com.ghost.fileshuttler.data.api

import com.ghost.fileshuttler.data.model.AuthResponse
import com.ghost.fileshuttler.data.model.VaultFile
import com.ghost.fileshuttler.util.SessionManager
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
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

            sessionManager.sessionCookie?.let { cookie ->
                requestBuilder.header("Cookie", cookie)
            }

            val response = chain.proceed(requestBuilder.build())
            val setCookie = response.headers("Set-Cookie")
            if (setCookie.isNotEmpty()) {
                sessionManager.sessionCookie = setCookie.first().substringBefore(";")
            }
            response
        }
        .build()

    suspend fun authenticate(pin: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        val url = "${sessionManager.baseUrl}/auth"
        val jsonBody = gson.toJson(mapOf("pin" to pin))
        val body = RequestBody.create("application/json; charset=utf-8".toMediaTypeOrNull(), jsonBody)

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
            Result.failure(Exception("Cannot connect to vault server at ${sessionManager.baseUrl}: ${e.message}"))
        }
    }

    suspend fun getFiles(): Result<List<VaultFile>> = withContext(Dispatchers.IO) {
        val url = "${sessionManager.baseUrl}/files"
        val request = Request.Builder()
            .url(url)
            .get()
            .build()

        try {
            val response = client.newCall(request).execute()
            if (response.code == 401) {
                // Try silent re-authentication with stored PIN
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

    suspend fun uploadFile(
        file: File,
        mimeType: String,
        onProgress: (Int) -> Unit
    ): Result<String> = withContext(Dispatchers.IO) {
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

    suspend fun downloadFile(fileId: Int, destinationFile: File): Result<File> = withContext(Dispatchers.IO) {
        val url = "${sessionManager.baseUrl}/download/$fileId"
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

    suspend fun deleteFile(fileId: Int): Result<Boolean> = withContext(Dispatchers.IO) {
        val url = "${sessionManager.baseUrl}/delete/$fileId"
        val request = Request.Builder()
            .url(url)
            .post(RequestBody.create(null, ByteArray(0)))
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
