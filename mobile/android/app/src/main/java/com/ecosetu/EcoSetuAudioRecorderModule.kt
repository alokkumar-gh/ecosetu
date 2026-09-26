package com.ecosetu

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.util.concurrent.atomic.AtomicBoolean

/**
 * EcoSetuAudioRecorderModule
 * Native Android 16kHz 16-bit Mono PCM WAV Audio Recording bridge for ECOSETU BHASHINI Voice Pipeline.
 *
 * Captures clean speech audio directly using AudioRecord and encodes standard RIFF/WAV format.
 * Guarantees 100% compatibility with BHASHINI Dhruva ASR service (16000Hz, 16-bit, Mono PCM).
 */
class EcoSetuAudioRecorderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private val isRecording = AtomicBoolean(false)
    private var currentPcmFile: File? = null
    private var currentWavFile: File? = null

    override fun getName(): String {
        return "EcoSetuAudioRecorder"
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(true)
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecording.get()) {
            promise.reject("ALREADY_RECORDING", "Audio recording is already in progress")
            return
        }

        try {
            val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
            val bufferSize = (minBufferSize * 2).coerceAtLeast(4096)

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                cleanupRecorder()
                promise.reject("INIT_FAILED", "Failed to initialize AudioRecord")
                return
            }

            val cacheDir = reactContext.cacheDir
            currentPcmFile = File.createTempFile("ecosetu_raw_", ".pcm", cacheDir)
            currentWavFile = File.createTempFile("ecosetu_voice_", ".wav", cacheDir)

            audioRecord?.startRecording()
            isRecording.set(true)

            val pcmFile = currentPcmFile!!
            recordingThread = Thread({
                var fos: FileOutputStream? = null
                try {
                    fos = FileOutputStream(pcmFile)
                    val buffer = ByteArray(bufferSize)
                    while (isRecording.get()) {
                        val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                        if (read > 0) {
                            fos.write(buffer, 0, read)
                        }
                    }
                } catch (_: Exception) {
                } finally {
                    try {
                        fos?.flush()
                        fos?.close()
                    } catch (_: Exception) {}
                }
            }, "EcoSetuAudioRecordingThread").apply { start() }

            promise.resolve(true)
        } catch (e: Exception) {
            isRecording.set(false)
            cleanupRecorder()
            promise.reject("RECORD_ERROR", e.message ?: "Failed to start audio recording")
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (!isRecording.get()) {
            promise.resolve(null)
            return
        }

        try {
            isRecording.set(false)
            try {
                audioRecord?.stop()
                recordingThread?.join(1000)
            } catch (_: Exception) {}

            cleanupAudioRecordOnly()

            val pcmFile = currentPcmFile
            val wavFile = currentWavFile

            if (pcmFile != null && pcmFile.exists() && pcmFile.length() > 0 && wavFile != null) {
                writeWavHeaderAndData(pcmFile, wavFile)

                val bytes = ByteArray(wavFile.length().toInt())
                FileInputStream(wavFile).use { it.read(bytes) }

                cleanupRecorder()

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
        isRecording.set(false)
        cleanupRecorder()
        promise.resolve(true)
    }

    private fun writeWavHeaderAndData(pcmFile: File, wavFile: File) {
        val pcmSize = pcmFile.length()
        val totalDataLen = pcmSize + 36
        val sampleRate = SAMPLE_RATE.toLong()
        val channels = 1
        val byteRate = (16 * sampleRate * channels / 8)

        val header = ByteArray(44)

        // RIFF/WAVE header
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()
        header[4] = (totalDataLen and 0xff).toByte()
        header[5] = (totalDataLen shr 8 and 0xff).toByte()
        header[6] = (totalDataLen shr 16 and 0xff).toByte()
        header[7] = (totalDataLen shr 24 and 0xff).toByte()
        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte() // 'fmt ' chunk
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()
        header[16] = 16 // 4 bytes: size of 'fmt ' chunk
        header[17] = 0
        header[18] = 0
        header[19] = 0
        header[20] = 1 // format = 1 (PCM)
        header[21] = 0
        header[22] = channels.toByte()
        header[23] = 0
        header[24] = (sampleRate and 0xff).toByte()
        header[25] = (sampleRate shr 8 and 0xff).toByte()
        header[26] = (sampleRate shr 16 and 0xff).toByte()
        header[27] = (sampleRate shr 24 and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte()
        header[29] = (byteRate shr 8 and 0xff).toByte()
        header[30] = (byteRate shr 16 and 0xff).toByte()
        header[31] = (byteRate shr 24 and 0xff).toByte()
        header[32] = (channels * 16 / 8).toByte() // block align
        header[33] = 0
        header[34] = 16 // bits per sample
        header[35] = 0
        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()
        header[40] = (pcmSize and 0xff).toByte()
        header[41] = (pcmSize shr 8 and 0xff).toByte()
        header[42] = (pcmSize shr 16 and 0xff).toByte()
        header[43] = (pcmSize shr 24 and 0xff).toByte()

        FileOutputStream(wavFile).use { out ->
            out.write(header, 0, 44)
            FileInputStream(pcmFile).use { `in` ->
                val buffer = ByteArray(4096)
                var bytesRead: Int
                while (`in`.read(buffer).also { bytesRead = it } != -1) {
                    out.write(buffer, 0, bytesRead)
                }
            }
        }
    }

    private fun cleanupAudioRecordOnly() {
        try {
            audioRecord?.release()
        } catch (_: Exception) {}
        audioRecord = null
    }

    private fun cleanupRecorder() {
        cleanupAudioRecordOnly()
        try {
            recordingThread?.interrupt()
        } catch (_: Exception) {}
        recordingThread = null

        try {
            currentPcmFile?.let { if (it.exists()) it.delete() }
        } catch (_: Exception) {}
        currentPcmFile = null

        try {
            currentWavFile?.let { if (it.exists()) it.delete() }
        } catch (_: Exception) {}
        currentWavFile = null
    }
}
