package com.morixoficial.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onPause() {
        super.onPause();

        // Reactivar WebView para que JS no se congele
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().onResume();
                getBridge().getWebView().resumeTimers();
            }
        } catch (Exception e) { /* ignore */ }

        // Iniciar Foreground Service (Morix Audio Service)
        Intent svc = new Intent(this, BackgroundAudioService.class);
        svc.setAction(BackgroundAudioService.ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(svc);
        } else {
            startService(svc);
        }
    }

    @Override
    public void onResume() {
        super.onResume();

        // Detener el servicio cuando el usuario vuelve a la app
        Intent svc = new Intent(this, BackgroundAudioService.class);
        svc.setAction(BackgroundAudioService.ACTION_STOP);
        startService(svc);
    }
}
