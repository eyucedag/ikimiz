# İkimiz — Aurora Forest / Codex entegrasyon rehberi

Bu ZIP'i açıp dosyaları mevcut Expo/React Native projesinin `assets/aurora/` klasörüne kopyala.

## Uygulama kuralları
- **Önce mevcut proje dosyalarını incele.** Var olan ekranları, navigation rotalarını ve Supabase entegrasyonunu koru.
- `illustrations/*.png` dosyaları gerçek 512×512 saydam PNG'dir. SVG kaynakları da sağlanmıştır.
- `icons/` mevcut temel ikonların PNG/SVG sürümlerini içerir.
- `app_icon_1024.png` önerilen yeni uygulama ikonudur; mevcut ikon kullanıcı onayı olmadan değiştirilmesin.
- `asset_manifest.json` renkler, kategoriler ve saat aralıklarını listeler.
- `sky_*.png` görsellerini ana ekranın üst manzara alanında `cover` olarak kullan; bütün ekranın arkasına uzatma.
- Günün saatini cihazdan al, AppState active olduğunda yeniden kontrol et; aralık sınırlarında güncelle.
- Gökyüzü görselleri aynı kadrajla hazırlanmış olmalı; geçişte iki Image katmanı arasında opacity animasyonu kullan.
- Tabletlerde grid kolon sayısını genişliğe göre belirle, mobilde 2 kolon.
- Alt tab bar'ı safe area içine yerleştir; yüzen ayarlar butonunu kaldır.
- Dekorlar içerik üstüne bindirilmemeli; tıklama alanlarını kapatmamalı.
- TypeScript/lint/test çalıştır ve başarısız testleri raporla.

## Görsel kapsamı
- 12 kategorinin **gerçek ayrı dosya** illüstrasyonları: `illustrations/*.png` + SVG kaynak.
- Önceki paketten gökyüzü, ikon ve dekor dosyaları.
- Referans panosundaki detaylı resimlerle bu çizgisel vektör illüstrasyonlar birebir aynı değildir. Bu dosyalar temiz, şeffaf ve uygulamada kullanılabilir alternatiflerdir.

## İstenen uygulama sırası
1. Var olan ekran ve navigasyon yapısını incele.
2. Renk tokenlarını ekle.
3. Dinamik gökyüzü bileşenini oluştur.
4. Bugün ve Kategoriler ekranlarını güncelle.
5. Kategori illüstrasyonlarını entegre et.
6. Ekran boyutları, safe area ve erişilebilirliği test et.
7. Değişiklikleri özetle.
