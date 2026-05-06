# Configuración de Audio en Segundo Plano para Capacitor Android

Para que la notificación del reproductor aparezca correctamente en Android,
aplica los siguientes cambios en Android Studio ANTES de compilar el APK.

---

## 1. AndroidManifest.xml
Ruta: `android/app/src/main/AndroidManifest.xml`

Añade estos permisos dentro de `<manifest>`:
```xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

Añade dentro de `<application>`:
```xml
<service
    android:name="androidx.media3.session.MediaSessionService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="true">
    <intent-filter>
        <action android:name="androidx.media3.session.MediaSessionService"/>
    </intent-filter>
</service>
```

---

## 2. capacitor.config.json
```json
{
  "appId": "com.mentex.app",
  "appName": "Mentex",
  "webDir": "dist",
  "android": {
    "backgroundColor": "#030309",
    "allowMixedContent": false,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  },
  "plugins": {
    "CapacitorHttp": {
      "enabled": true
    }
  }
}
```

---

## 3. MainActivity.kt
Ruta: `android/app/src/main/java/com/mentex/app/MainActivity.kt`

```kotlin
package com.mentex.app

import android.os.Bundle
import android.view.WindowManager
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Mantiene la pantalla activa durante reproducción
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}
```

---

## 4. build.gradle (app-level)
Ruta: `android/app/build.gradle`

Asegúrate de tener `minSdk 26` o superior (Media Session funciona mejor):
```gradle
android {
    defaultConfig {
        minSdk 26
        targetSdk 34
    }
}
```

---

Con estos cambios + los fixes en el código web (previoustrack/nexttrack handlers,
WakeLock API, AudioContext keep-alive), la notificación del reproductor aparecerá
correctamente en la barra de estado de Android con controles de Play/Pause y Skip.
