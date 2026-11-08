# Kararlılık taraması — 8 Kasım 2026

Ana çalışma kopyası `/workspace/ikimiz`, dal `codex/ruh-halim`.
Eski çalışma kopyası `/workspace/ikimiz-legacy-backup-20261108` altında korundu.

## Düzeltilen davranışlar

- Konum yönü ve otomatik adım sayımı tek GPS oturumu kullanır. Yönü kapatmak diğer
  özelliğin konumunu silmez. Başlatma iptalleri ve arka plana geçiş sensör sızıntısı bırakmaz.
- Durağan telefonların konumu uygulama açıkken güncel tutulur. iOS izin pencereleri
  paylaşımı kapatmaz; gerçek arka plan geçişi kapatır. Konum yazma/silme işlemleri sıralanır.
- Oturum değişimi sırasında Supabase auth kilidi içinde yeni istek başlatılmaz.
  Eşleşme bilgisi tüm ekranlar için ortak yüklenir. Geçici ağ hatası eşleşmeyi silmez.
- Kullanıcı veya aktif çift değişince önceki oturumun ekran verileri ve taslakları temizlenir.
  Daha eski sorguların güncel bildirim/ana ekran/not verilerini ezmesi engellenir.
- Android dosya adresleri fotoğraf, belge, ses ve sticker için ortak native okuma yolunu kullanır.
  Geçici dosyalar temizlenir; boş/bozuk içerik reddedilir.
- Galeri, ses ve belge önizleme bağlantıları toplu oluşturulur. Belge silmede kayıt yetkisi
  doğrulanmadan dosya silinmez. Ağ beklemelerine süre sınırı konur.
- Takvim günleri UTC anlarıyla karıştırılmaz. Tek seferlik özel günler her yıl yeniden
  gösterilmez. Yaklaşanlar bir haftayla sınırlıdır; bugünkü tüm gün etkinlikleri korunur.
  Yıl sonu, artık gün ve gece yarısı senaryoları kapsanır.
- Canlı güncellemeler şarkı/not düzenleme taslaklarını silmez. Kayıt yanıtı ile canlı
  güncelleme aynı kaydı getirdiğinde ikinci bir kart eklenmez.
- Ana ekrandaki saniye sayacı ayrı bileşendedir. Manzara gerçek kapsayıcı genişliğini
  kullanır; ekran kenarındaki güvenli alanlar içerik genişliğinden düşülür.
- Öpücük, arka plandaki etkileşimleri engelleyen native modal içinde gösterilir.
- Uzun süre kuruyan bitki sulanınca toparlanır. Bitki değiştirmek geçmiş kuruma süresini
  yeni türün hızına göre yeniden hesaplamaz. Bu sunucu düzeltmesi yeni SQL gerektirir.
- Kullanılmayan stiller/ikon eşlemeleri temizlendi, kod biçimi ortak hale getirildi.
  Animasyon paketinin SDK sürümü sabitlendi; eksik `expo-asset` bağımlılığı eklendi.

## Doğrulama

- ESLint: sıfır hata / uyarı; TypeScript: strict ve kullanılmayan değişken denetimleri temiz.
- Jest: 16 test grubu, 69 başarılı test. Native dosyalar/sensörler taklitlerle sınanır.
- Geçici PostgreSQL: 10 başarılı kontrol; canlı Supabase'e bağlanmaz.
- Yaklaşanlar/tarih testleri: UTC, Europe/Istanbul ve America/Los_Angeles.
- Prettier biçim kontrolü başarılı; Expo Doctor 20/20 başarılı.
- iOS ve Android üretim bundle dışa aktarımları başarılı.
- Önizleme workflow'u yayından önce `npm run validate` çalıştırır.

Gerçek iki telefonla GPS yön doğruluğu ve cihazın fiziksel sensör davranışı bu ortamda
ölçülmedi; otomatik testler yaşam döngüsü ve veri akışını doğrular.

## Canlı SQL adımı

`supabase/migrations/20261108_flower_health_consistency.sql` canlıya otomatik uygulanmadı.
[SQL Editor](https://supabase.com/dashboard/project/phrfepvdjebxfmfkhiju/sql/new) üzerinden
çalıştırılmalıdır. Mevcut bitki kayıtlarını silmez. Kurulum sırası `supabase/README.md` içindedir.
