# Eylem Pusulası

Mobil öncelikli, Türkçe bir kişisel saha defteri. **Eylem sabit, sonuç serbest, optimizasyon yasak.** Puan, hedef, streak, hatırlatıcı ve bulut eşitlemesi içermez.

## Kullanım

Bugün ekranında her gün aynı yedi faaliyet görünür. Satır adına dokunarak giriş açılır; sağdaki `+` ile sayı gerektirmeyen faaliyet doğrudan kaydedilebilir. Kalori ve adımda gerçekleşen toplam girilir. Kayıtlı faaliyete dokunarak düzeltilebilir veya kaldırılabilir. Hiçbir faaliyet zorunlu değildir.

Kitap ve haftalık konu bir defa seçilir. “Kitabı/Videoyu bitirdim” işlemi günlük işaretten bağımsızdır; yeni seçim ertelenebilir. Geçmiş günlük kayıtlar, o gün kullanılan kitap/video/döneme bağlı kalır. Aynı gün birden fazla kitap veya video bitirilebilir, günlük faaliyet işareti tek kayıttır ve ilk kaydın ilişkisini korur.

Araştırmanın ilk günü 1. gündür. İlk 7 gün açıktır; 7. günün bitiminden sonra ikinci döneme devam kararı istenir. Karar verilene kadar yeni çalışma kaydı alınmaz. Devam seçimi takvimi yeniden başlatmaz: son gün başlangıç +13 gündür. 14. günün sonundan sonraki ilk açılışta otomatik kapanır. Devam edilmemişse dönem ilk 7 günün sonuna tarihlenir. Yeni dönem kendiliğinden başlamaz. İstediğiniz gün notla erken kapatıp aynı veya farklı bir programa geçebilirsiniz.

Raporlar, kayıtlar üzerinden anlık hesaplanır. Haftalar pazar–cumartesidir. Eksik sayısal kayıtlar ortalamaya girmez, gerçek `0` girer. Aylık karşılaştırmada ay dışındaki günler hariç tutulur. Geçmiş bölümü mevcut sayısal değer ve antrenman açıklamalarını düzeltir; geçmişte boş faaliyete kayıt açmaz.

## Geliştirme ve üretim

Node.js 24 ve pnpm 11.25.0 gerekir. `npm install -g pnpm@11.25.0` ile paket yöneticisini kurabilirsiniz.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

`dist/` statik yayın çıktısıdır. `file://` ile açmayın. Yerel deneme için terminalin verdiği localhost adresini kullanın. Üretimde HTTPS gerekir. React + TypeScript + Vite, IndexedDB (`idb`), Zod ve Workbox tabanlı service worker kullanılır. DM Sans ve Newsreader fontları uygulama paketindedir; font sunucusuna istek yapılmaz. Fontların lisansları paketlerin `LICENSE` dosyalarında bulunur.

## GitHub Pages'e yayınlama

1. Bu klasörün içeriğini yeni GitHub deponuzun köküne koyun. `node_modules`, `.pnpm-store` ve `dist` yüklemeyin; `.gitignore` hazırdır.
2. Deponun **Settings → Pages → Build and deployment → Source** alanını **GitHub Actions** seçin.
3. Varsayılan dal `main` olmalıdır. Farklıysa `.github/workflows/pages.yml` içindeki dalı değiştirin.
4. `main` dalına gönderin. İş akışı bağımlılıkları kurar, testleri çalıştırır, derler ve Pages'e yayınlar.
5. **Actions → GitHub Pages → deploy** adımındaki HTTPS bağlantısını açın. GitHub hesabınızın Pages için desteklediği depo görünürlüğünü kullanın.

İş akışı depo adından `/depo-adi/` taban yolunu hesaplar. `kullanici.github.io` kök deposu veya özel alan adı için `VITE_BASE_PATH: /` yapın. Elle dağıtımda macOS/Linux: `VITE_BASE_PATH=/depo-adi/ pnpm build`; PowerShell: `$env:VITE_BASE_PATH='/depo-adi/'; pnpm build`. Varsayılan `./` ayarı kök ve alt klasörde çalışır. Manifest `start_url`, ikonlar ve worker kapsamı aynı alt dizinde kalır.

Diğer statik sunucularda `dist/` klasörünü HTTPS ile servis edin. `sw.js` ve `index.html` için kısa önbellek süresi, isimlerinde hash bulunan dosyalar için uzun önbellek süresi kullanılması uygundur. Uygulama sunucusu veya veritabanı sunucusu gerekmez. `.openai/hosting.json` yalnızca mevcut Sites yayınına aittir; GitHub Pages için kullanılmaz.

## Android ana ekranına kurma

1. HTTPS adresini Android Chrome'da açın. İlk yükleme çevrimiçiyken tamamlanmalı.
2. Sağ üstteki ayarlarda **Çevrimdışı kullanım hazır** yazısını kontrol edin.
3. Chrome'un üç nokta menüsünden **Uygulamayı yükle** / **Ana ekrana ekle** seçin. Chrome izin verirse uygulama ayarlarında **Telefona kur** düğmesi de görünür.
4. Ana ekrandaki simgeden açın. İlk kurulumdan sonra internet gerektirmeden kayıt tutabilirsiniz.
5. Uçak modunda uygulamayı kapatıp yeniden açarak kendi telefonunuzda son kontrolü yapın.

Yeni sürüm bulunduğunda ayarlarda **Yeni sürümü aç** görünür. Kaydetme işlemi bitince bu düğmeye basın. Worker yalnızca uygulama dosyalarını yeniler; IndexedDB'yi silmez. Tarayıcıya, HTTPS adresine ve cihaza göre kurulum menüsü farklı görünebilir.

## Veri güvenliği ve yedek

Kişisel kayıtlar sunucuya gönderilmez; tüm veriler açılan adresin tarayıcı depolamasındadır. Hesap, analitik, üçüncü taraf API veya bulut veritabanı yoktur. Hosting sağlayıcısı uygulama dosyalarına gelen normal HTTP isteklerini görebilir; faaliyet içerikleri bu isteklere eklenmez.

**Tarayıcı verilerini temizlemek, gizli pencereyi kapatmak veya cihazı kaybetmek kayıtları kaybettirebilir.** Kalıcı depolama izni istenebilir; izin verilmesi bir yedek yerine geçmez. Sites, localhost ve GitHub Pages farklı adreslerdir: aynı defteri otomatik paylaşmazlar. Adres değiştirirken yedekle taşıyın.

Ayarlar → **JSON yedeğini indir** bütün koleksiyonları ve ayarları içerir. Dosyayı güvenli bir yerde saklayın; şifreli değildir. **Yedekten geri yükle** önce dosyanın sürümünü, türlerini, tarihlerini, kimliklerini ve ilişkilerini doğrular; ardından kullanıcı onayı ister. Onaylanırsa mevcut defter bir IndexedDB transaction'ı içinde tamamen değiştirilir. Bozuk dosya veya başarısız işlem mevcut defteri silmez. Birleştirme yapılmaz. Geri yüklemeden önce mevcut defteri indirme düğmesi sunulur.

## Veri modeli ve tarih kuralları

IndexedDB adı `eylem-pusulasi`, şema sürümü `1`. Object store'lar: `DailyEntries`, `Books`, `WeeklyVideoSelections`, `Programs`, `ResearchSessions`, `AppSettings`. UUID ilişkileri kitap, video ve araştırma bağlamını korur. Bütün ilişkili güncellemeler tek transaction'la yazılır. Sekmeler Web Locks ve BroadcastChannel ile koordine edilir. Yedek formatı `eylem-pusulasi`, sürüm `1`.

Şema değişikliklerinde `db.ts` içindeki `openDB` sürümünü artırıp `upgrade` içinde mevcut store'ları koruyan dönüşüm ekleyin; veritabanını silmeyin. Yedek sürüm yükseltmelerini doğrulayıcıda açıkça ele alın. Raporları ayrı, çelişebilen tablolar olarak saklamayın.

Tüm günler `Intl.DateTimeFormat` ile `Europe/Istanbul` üzerinden hesaplanır. Takvim işlemleri UTC gün aritmetiği kullanır; telefonun saat dilimi değişse de İstanbul günü aynıdır. Görünürken gece yarısı kontrolü yapılır, uygulamaya dönüldüğünde tarih yeniden okunur. Gün geri alınmışsa son görülen gün korunur ve uyarı gösterilir. Çevrimdışı ve harici saat kaynağı olmayan bir uygulama, telefon saatinin kasıtlı olarak ileri alınmasını gerçek zaman geçişinden ayıramaz; cihazın otomatik tarih/saat ayarını açık tutun.

## Doğrulama

`pnpm test` günlük düzenleme, gece yarısı, geçmiş kısıtları, kitap/video yaşam döngüleri, 7/14 gün araştırma sınırları, tekrar ziyaret, eksik veri ortalamaları, ay sınırları, tam yedek, bozuk yedek ve IndexedDB yeniden açılışını test eder. Güncel uygulamalı kontrol ve sınırlar için [TEST-RESULTS.md](TEST-RESULTS.md) dosyasına bakın.
