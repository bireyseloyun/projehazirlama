package com.eylempusulasi.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/www/index.html";
    private static final int EXPORT_FILE = 41, IMPORT_FILE = 42;
    private final ExecutorService files = Executors.newSingleThreadExecutor();
    private WebView web;
    private FrameLayout root;
    private ValueCallback<Uri[]> fileChooser;
    private boolean exporting;
    private File pendingBackup;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        pendingBackup = new File(getCacheDir(), "pending-backup.json");
        exporting = saved != null && saved.getBoolean("exporting", false) && pendingBackup.isFile();
        if (!exporting) pendingBackup.delete();
        root = new FrameLayout(this);
        setContentView(root);
        updateSystemColors();
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                root.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            } else {
                root.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        createWebView();
    }

    private void updateSystemColors() {
        boolean dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int color = Color.parseColor(dark ? "#21241f" : "#f4f2ea");
        root.setBackgroundColor(color);
        getWindow().setStatusBarColor(color);
        getWindow().setNavigationBarColor(color);
        getWindow().getDecorView().setSystemUiVisibility(dark ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }

    private void createWebView() {
        web = new WebView(this);
        web.setId(View.generateViewId());
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        web.setBackgroundColor(Color.TRANSPARENT);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only URIs explicitly chosen by the user.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setBlockNetworkLoads(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (isLocal(url)) {
                    WebResourceResponse result = assets.shouldInterceptRequest(url);
                    if (result != null) return result;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isLocal(request.getUrl());
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!HOME.equals(url)) return;
                // Cloud and network are never needed; a local origin preserves IndexedDB across updates.
                view.evaluateJavascript("window.dispatchEvent(new Event('android-ready'))", null);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChooser != null) fileChooser.onReceiveValue(null);
                fileChooser = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivityForResult(pick, IMPORT_FILE); }
                catch (Exception error) { callback.onReceiveValue(null); fileChooser = null; }
                return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("Onayla", (d, w) -> result.confirm())
                    .setNegativeButton("Vazgeç", (d, w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "EylemNative", Collections.singleton(ORIGIN),
                (view, message, source, mainFrame, reply) -> {
                    if (mainFrame && ORIGIN.equals(source.toString())) handleMessage(message.getData());
                });
        } else {
            // No external page can navigate into this WebView or receive this bridge.
            web.addJavascriptInterface(new LocalBridge(), "EylemNative");
        }
        web.loadUrl(HOME);
    }

    private boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }

    private class LocalBridge {
        @JavascriptInterface public void postMessage(String message) { runOnUiThread(() -> handleMessage(message)); }
    }

    private void handleMessage(String text) {
        if (text == null || text.length() > 26_000_000) { exportResult("error"); return; }
        try {
            JSONObject request = new JSONObject(text);
            if ("minimize".equals(request.optString("action"))) { moveTaskToBack(true); return; }
            if (!"export".equals(request.optString("action")) || exporting) return;
            String data = request.getString("data");
            JSONObject backup = new JSONObject(data);
            if (!"eylem-pusulasi".equals(backup.optString("format")) || backup.optInt("version") != 1) throw new IllegalArgumentException();
            String requested = request.optString("filename", "eylem-pusulasi.json");
            String filename = requested.matches("eylem-pusulasi-\\d{4}-\\d{2}-\\d{2}\\.json") ? requested : "eylem-pusulasi.json";
            exporting = true;
            files.execute(() -> {
                try {
                    try (FileOutputStream out = new FileOutputStream(pendingBackup)) {
                        out.write(data.getBytes(StandardCharsets.UTF_8));
                        out.getFD().sync();
                    }
                    runOnUiThread(() -> {
                        try {
                            Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                                .setType("application/json").putExtra(Intent.EXTRA_TITLE, filename);
                            startActivityForResult(save, EXPORT_FILE);
                        } catch (Exception error) { finishExport("error"); }
                    });
                } catch (Exception error) { runOnUiThread(() -> finishExport("error")); }
            });
        } catch (Exception error) { exportResult("error"); }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == IMPORT_FILE) {
            ValueCallback<Uri[]> callback = fileChooser;
            fileChooser = null;
            Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            if (callback != null) callback.onReceiveValue(uri != null && "content".equals(uri.getScheme()) ? new Uri[]{uri} : null);
        }
        if (request == EXPORT_FILE) {
            Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            if (uri == null) { finishExport("cancelled"); return; }
            if (!"content".equals(uri.getScheme())) { finishExport("error"); return; }
            files.execute(() -> {
                try (FileInputStream input = new FileInputStream(pendingBackup); OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new IllegalStateException();
                    byte[] buffer = new byte[8192]; int n;
                    while ((n = input.read(buffer)) != -1) output.write(buffer, 0, n);
                    output.flush();
                } catch (Exception error) { runOnUiThread(() -> finishExport("error")); return; }
                runOnUiThread(() -> finishExport("saved"));
            });
        }
    }

    private void finishExport(String status) {
        exporting = false;
        pendingBackup.delete();
        exportResult(status);
    }
    private void exportResult(String status) {
        if (web != null) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('android-export-result',{detail:{status:" + JSONObject.quote(status) + "}}))", null);
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){if(!document.querySelector('.app-shell'))return false;window.dispatchEvent(new Event('android-back'));return true})()", result -> {
            if ("false".equals(result)) moveTaskToBack(true);
        });
    }
    @Override public void onConfigurationChanged(Configuration config) { super.onConfigurationChanged(config); updateSystemColors(); }
    @Override protected void onSaveInstanceState(Bundle state) { state.putBoolean("exporting", exporting); super.onSaveInstanceState(state); }
    @Override protected void onPause() { super.onPause(); if (web != null) web.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (fileChooser != null) fileChooser.onReceiveValue(null);
        files.shutdown();
        if (web != null) { root.removeView(web); web.destroy(); web = null; }
        super.onDestroy();
    }
    WebView webViewForTest() { return web; }
}
