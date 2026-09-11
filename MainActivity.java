package com.pizzeria.comande;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private static final String CHANNEL_ID = "comande_channel";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);

        // Collegamento tra JavaScript del sito web e codice nativo Android
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");
        
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html"); // o URL del server http://192.168.x.x/api.php

        createNotificationChannel();
    }

    // Interfaccia Javascript nativa
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void onOrderSent(String tavolo, double totale) {
            Toast.makeText(mContext, "Ordine Tavolo " + tavolo + " registrato su Android!", Toast.LENGTH_SHORT).show();
            
            // Trigger Notifica Locale / Suono per la cucina
            sendLocalNotification("Nuova Comanda!", "Tavolo " + tavolo + " - Totale: €" + totale);
            
            // Stampa via Bluetooth ESC/POS
            printBluetoothEscPos("COMANDA TAVOLO " + tavolo + "\nTotale: EUR " + totale + "\n\n");
        }
    }

    private void sendLocalNotification(String title, String message) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(1, builder.build());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Notifiche Comande", NotificationManager.IMPORTANCE_HIGH);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    // Metodo stub per la connessione e invio dati a Stampante Bluetooth ESC/POS
    private void printBluetoothEscPos(String textData) {
        // Implementazione socket Bluetooth (BluetoothAdapter / BluetoothSocket)
        System.out.println("Invio in corso alla stampante Bluetooth: " + textData);
    }
}
