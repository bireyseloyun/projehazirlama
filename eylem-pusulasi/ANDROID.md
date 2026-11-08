# Eylem Pusulası — bağımsız Android uygulaması

APK bütün HTML, JavaScript, CSS, ikon ve fontları kendi içinde taşır. İlk açılış dahil internet veya hesap gerekmez. Uygulamanın Android manifestinde **INTERNET izni yoktur**. WebView yalnızca paketteki dosyaları açabilir. `appassets.androidplatform.net` bir sunucu değildir; Android'in cihaz içindeki dosyalar için kullandığı sabit yerel adrestir.

## Telefona kurma

1. `Eylem-Pusulasi.apk` dosyasını telefonunuza indirin veya USB ile aktarın.
2. Dosyalar uygulamasından APK'ye dokunun. Android sorarsa kullandığınız dosya yöneticisine bu kaynaktan uygulama yükleme izni verin.
3. Yükleyin ve ana ekrandaki Eylem Pusulası simgesinden açın.
4. Ayarlardaki JSON yedeği, Android'in dosya kaydetme penceresini açar. Geri yüklemede dosya seçilir, doğrulanır ve ayrıca onay istenir.

Play Store ve ChatGPT üyeliği gerekmez. Tarayıcıdaki eski defter ile APK'nin verisi ayrıdır; taşımak için eski sürümden JSON yedeği alıp APK'ye geri yükleyin. APK ilk kurulumda boş defterle başlar.

## Veriler ve güncellemeler

Kayıtlar uygulamanın özel alanındaki IndexedDB'de kalır. Uygulamayı kapatıp açmak veya aynı kimlik ve imzayla güncellemek kayıtları silmez. Uygulamayı kaldırmak veya Android ayarlarından uygulama verisini temizlemek kayıtları siler. Android bulut yedeklemesi ve cihazlar arası otomatik aktarım kapalıdır; JSON yedeği uygulamadan bağımsız bir yerde saklanmalıdır.

Güncelleme için yeni APK'yi mevcut uygulamanın üzerine kurun. Uygulama kimliği `com.eylempusulasi.app` ve imza anahtarı korunmalıdır. Teslim edilen **imza yedeğini özel olarak saklayın**; gelecekte aynı uygulamayı güncellemek için gerekir. Anahtarı ve içindeki parolayı herkese açık kaynak deposuna koymayın.

GitHub yalnızca kaynak kodunu derlemek için kullanılır; kurulan uygulama GitHub'a bağlanmaz. İmza dosyası GitHub'a açık biçimde yüklenmez: yalnızca özel kurtarma anahtarı bu bilgisayarda kalan, şifrelenmiş bir yedek yüklenir. Teslim edilen yerel imza yedeğinden gelecekteki güncellemeler hazırlanabilir. Başarılı ilk sürümden sonra otomatik güncellemeler için GitHub deposunun `EYLEM_SIGNING_KEY_B64` ve `EYLEM_SIGNING_PASSWORD` sırları yapılandırılmalıdır. Bunlar yoksa sistem farklı bir anahtara sessizce geçmez.

## Tekrar derleme

Node 24 + pnpm 11.25.0, JDK 17, Gradle 9.1 veya uyumlu bir sonraki 9.x sürümü, Android SDK 36 ve Build Tools 36.0.0 gerekir. GitHub Actions iş akışı bunları hazır ortamda kullanır.

```sh
pnpm install --frozen-lockfile
node node_modules/vitest/vitest.mjs run
node scripts/build-android.mjs
gradle -p android assembleRelease
```

İmzalı derleme için `EYLEM_KEYSTORE` ve `EYLEM_KEY_PASSWORD` ortam değişkenleri kullanılır. Android Studio kurulması gerekli değildir.

Android testi, uygulamanın ağ izni olmadığını, yedi faaliyetin açıldığını, günlük kayıt yazma ve yeniden açılışta kalıcılığı, Android belge seçicisinin döndürdüğü URI ile gerçek JSON dosyası yazma/okumayı ve geri yükleme onayını kontrol eder. Test belge sağlayıcısı yalnızca test APK'sındadır; teslim edilen uygulamaya dahil edilmez.
