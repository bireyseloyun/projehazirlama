# Doğrulama kaydı

8 Kasım 2026. Testler boş, yalnızca bu geliştirme için üretilmiş deneme kayıtlarıyla çalıştırıldı. Teslim edilen uygulama örnek kişisel kayıtla başlamaz.

## Otomatik testler

Vitest + fake-indexeddb ile 22 test:

- Günlük sayı oluşturma/düzeltme; aynı kayıt kimliğinin korunması.
- İstanbul 23.59.59 → 00.00 geçişi; eski günün kaydını koruma.
- Mevcut geçmiş kaydı düzeltme; geçmiş boş güne/faaliyete ve geleceğe kayıt engeli.
- Negatif, kesirli ve geçersiz sayıları reddetme.
- Telefon saat diliminden bağımsız gün; geriye alınan tarihte son görülen günü koruma.
- Kitap bitirme/yeni kitap; günlük okuma kaydından bağımsız bitiş ve geçmiş ilişki koruması.
- Pazar haftası video seçimi; hafta değişimi ve aynı hafta ikinci video.
- Araştırmada üçüncü gün kapanış, 7. gün sonu/8. gün karar, devam ve 14. gün sonu.
- Uygulama uzun süre kapalı kaldığında doğru son tarihle kapanma.
- Devam etmeme; aynı programa ayrı dönemle dönüş.
- Eksik kayıtlı ortalama, gerçek sıfır, ay sınırında kısmi hafta.
- Tüm koleksiyonlarla yedek turu; bozuk/uyumsuz/mükerrer/ilişkisiz yedeği reddetme.
- IndexedDB bağlantısını kapatıp açınca kalıcılık; geçersiz geri yüklemede eski veriyi koruma; sürüm 1'de yeniden açılış.

TypeScript tip kontrolü ve Vite üretim derlemesi çalıştırıldı. Manifest, 192/512 piksel PNG ikonları, paket içi fontlar, worker ve önbellek listesi derleme çıktısında üretildi.

## Tarayıcıda uygulanan kontroller

- 390 × 844 telefon görünümünde günlük ekran, giriş pencereleri ve gezinme.
- Kalori girme, düzeltme ve sayfa yenilemesinden sonra değerin korunması.
- Kitap seçimi, günlük okuma, kitap bitişi, yeni seçimi erteleme ve aynı gün tekrar açma.
- Gerçek deneme kayıtlarından haftalık matris ve aylık tablo oluşturma.
- Açık ve koyu tema.
- JSON dosyası indirme, dosya seçme, doğrulama özeti, açık kullanıcı onayı ve geri yükleme.
- **Yerel HTTP sunucusu kapatıldıktan sonra sayfa yeniden yüklendi ve İngilizce kaydı saklandı.** Bu, uygulama kabuğunun önbellekten açıldığını ve verinin sunucusuz yazıldığını doğruladı.
- Yeni service worker sürümüne uygulama içinden geçildikten sonra mevcut kalori kaydı korundu.
- `/alt-klasor/` taban yolu ile ayrı üretim derlemesi tarayıcıda açıldı; ayarlar çevrimdışı önbelleğin hazır olduğunu doğruladı. Manifest, fontlar ve worker alt klasör içinde yüklendi.

## Sınırlar

Gerçek bir Android telefonda Chrome kurulum menüsüne basma ve işletim sisteminden uygulamayı başlatma bu bilgisayardan doğrulanmadı. 390 piksel kontrolü Android donanım testi değildir. Üretim HTTPS kurulumunu README adımlarıyla telefonda tamamlayın. Yerel sunucunun kapatılması uçak modu veya gerçek ağ kopmasıyla aynı koşul değildir; önbellekten açılışı doğrular.

Şema henüz sürüm 1 olduğu için gelecekteki bir şema dönüşümü test edilmiş değildir. Güncel sürümler arasında IndexedDB'nin korunması doğrulandı; gelecekteki her migration ayrıca test edilmelidir. Tarayıcı depolamasının işletim sistemi tarafından silinmesine karşı JSON yedek gerekir.
