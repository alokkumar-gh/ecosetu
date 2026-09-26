package com.ecosetu

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

/**
 * EcoSetuTTSPackage
 * Registers EcoSetuTTSModule, EcoSetuAudioRecorderModule, and EcoSetuLocationModule.
 */
class EcoSetuTTSPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            EcoSetuTTSModule(reactContext),
            EcoSetuAudioRecorderModule(reactContext),
            EcoSetuSpeechModule(reactContext),
            EcoSetuLocationModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<View, ReactShadowNode<*>>> {
        return emptyList()
    }
}
