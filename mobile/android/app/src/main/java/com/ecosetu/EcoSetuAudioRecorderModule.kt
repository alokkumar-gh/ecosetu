package com.ecosetu

import android.media.MediaRecorder
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream

/**
 * EcoSetuAudioRecorderModule
 * Native Android Audio Recording bridge for ECOSETU BHASHINI Voice Pipeline.
 *
 * Responsibilities:
 * 1. Captures audio directly from device microphone using Android MediaRecorder.
 * 2. Encodes captured audio to standard base64 format.
 * 3. Sends audio to ECOSETU Backend -> BHASHINI (Zero Google Speech API dependency).
 * 4. Deletes local transient audio file immediately after reading.
 */
class EcoSetuAudioRecorderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaRecorder: MediaRecorder? = null
    private var currentOutputFile: File? = null
    private var isRecording: Boolean = false

    override fun getName(): String {
        return "EcoSetuAudioRecorder"
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecording) {
            promise.reject("ALREADY_RECORDING", "Audio recording is already in progress")
            return
        }

        try {
            val cacheDir = reactContext.cacheDir
            currentOutputFile = File.createTempFile("ecosetu_voice_", ".m4a", cacheDir)

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16000)
                setAudioEncodingBitRate(64000)
                setOutputFile(currentOutputFile?.absolutePath)
                prepare()
                start()
            }

            isRecording = true
            promise.resolve(true)
        } catch (e: Exception) {
            isRecording = false
            cleanupRecorder()
            promise.reject("RECORD_ERROR", e.message ?: "Failed to start audio recording")
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (!isRecording || mediaRecorder == null) {
            promise.resolve(null)
            return
        }

        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false

            val file = currentOutputFile
            if (file != null && file.exists() && file.length() > 0) {
                val bytes = ByteArray(file.length().toInt())
                FileInputStream(file).use { it.read(bytes) }
                file.delete()
                currentOutputFile = null

                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                promise.resolve(base64)
            } else {
                cleanupRecorder()
                promise.reject("NO_AUDIO", "Recorded audio file is empty")
            }
        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("STOP_ERROR", e.message ?: "Failed to stop audio recording")
        }
    }

    @ReactMethod
    fun cancelRecording(promise: Promise) {
        cleanupRecorder()
        promise.resolve(true)
    }

    private fun cleanupRecorder() {
        try {
            mediaRecorder?.release()
        } catch (_: Exception) {}
        mediaRecorder = null
        isRecording = false

        try {
            currentOutputFile?.let {
                if (it.exists()) it.delete()
            }
        } catch (_: Exception) {}
        currentOutputFile = null
    }
}
