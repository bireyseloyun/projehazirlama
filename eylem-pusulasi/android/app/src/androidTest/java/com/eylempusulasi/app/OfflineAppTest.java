package com.eylempusulasi.app;

import android.Manifest;
import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class OfflineAppTest {
    private ActivityScenario<MainActivity> scenario;
    private String js(String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> output = new AtomicReference<>("");
        scenario.onActivity(a -> a.webViewForTest().evaluateJavascript(script, result -> { output.set(result); done.countDown(); }));
        assertTrue("JavaScript response timed out", done.await(5, TimeUnit.SECONDS));
        return output.get();
    }
    private void waitFor(String predicate) throws Exception {
        long end = System.currentTimeMillis() + 30000;
        while (System.currentTimeMillis() < end) {
            if ("true".equals(js("Boolean(" + predicate + ")"))) return;
            Thread.sleep(100);
        }
        fail("Condition timed out: " + predicate + " Body: " + js("document.body.innerText"));
    }
    private void setCalories(String value) throws Exception {
        js("document.querySelector('.activity-row .activity-main').click()");
        waitFor("document.querySelector('input[type=number]')");
        js("(()=>{const el=document.querySelector('input[type=number]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'" + value + "');el.dispatchEvent(new Event('input',{bubbles:true}));})()");
        js("document.querySelector('.sheet form').requestSubmit()");
        waitFor("!document.querySelector('.sheet') && document.querySelector('.entry-value').innerText.includes('" + (value.equals("2350") ? "2.350" : "2.300") + "')");
    }
    private void openSettings() throws Exception {
        js("document.querySelector('[aria-label=\"Ayarlar ve yedekleme\"]').click()");
        waitFor("document.querySelector('.sheet')");
    }

    @Test public void offlineLifecycleAndNativeBackupRoundTrip() throws Exception {
        Instrumentation instrument = InstrumentationRegistry.getInstrumentation();
        assertEquals(PackageManager.PERMISSION_DENIED, instrument.getTargetContext().checkSelfPermission(Manifest.permission.INTERNET));
        scenario = ActivityScenario.launch(MainActivity.class);
        try {
            waitFor("document.querySelectorAll('.activity-row').length===7");
            assertEquals("\"https://appassets.androidplatform.net\"", js("location.origin"));
            assertEquals("true", js("Boolean(window.EylemNative)"));
            setCalories("2350");
            scenario.recreate();
            waitFor("document.querySelector('.entry-value')?.innerText.includes('2.350')");

            Instrumentation.ActivityMonitor export = instrument.addMonitor(new IntentFilter(Intent.ACTION_CREATE_DOCUMENT),
                new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent().setData(TestDocumentsProvider.URI)), true);
            try {
                openSettings();
                assertTrue(js("document.querySelector('.settings-foot').innerText").contains("Android"));
                js("document.querySelector('.sheet button.action-line').click()");
                waitFor("document.body.innerText.includes('Yedek dosyası kaydedildi')");
                assertEquals(1, export.getHits());
            } finally { instrument.removeMonitor(export); }
            try (InputStream stream = instrument.getTargetContext().getContentResolver().openInputStream(TestDocumentsProvider.URI)) {
                JSONObject backup = new JSONObject(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
                assertEquals("eylem-pusulasi", backup.getString("format"));
                assertEquals(2350, backup.getJSONObject("data").getJSONArray("entries").getJSONObject(0).getInt("value"));
                assertEquals(1, backup.getJSONObject("data").getJSONArray("entries").length());
            }
            js("document.querySelector('[aria-label=\"Pencereyi kapat\"]').click()");
            setCalories("2300");

            Instrumentation.ActivityMonitor restore = instrument.addMonitor(new IntentFilter(Intent.ACTION_OPEN_DOCUMENT),
                new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent().setData(TestDocumentsProvider.URI)), true);
            try {
                openSettings();
                js("document.querySelector('input[type=file]').click()");
                waitFor("document.querySelector('.sheet h2')?.innerText==='Yedeği geri yükle'");
                // The app must wait for explicit user confirmation before restoring.
                assertTrue(js("document.querySelector('.entry-value').innerText").contains("2.300"));
                js("Array.from(document.querySelectorAll('.sheet button')).find(b=>b.innerText==='Onaylıyorum, geri yükle').click()");
                waitFor("!document.querySelector('.sheet') && document.querySelector('.entry-value').innerText.includes('2.350')");
                assertEquals(1, restore.getHits());
            } finally { instrument.removeMonitor(restore); }
            scenario.recreate();
            waitFor("document.querySelector('.entry-value')?.innerText.includes('2.350')");
            assertEquals("7", js("document.querySelectorAll('.activity-row').length"));
        } finally { scenario.close(); }
    }
}
