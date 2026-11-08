# İkimiz

Çiftlerin takvim, özel günler, listeler, notlar, fotoğraflar, sesli anılar ve günlük ruh
hallerini paylaşabildiği Türkçe Expo / React Native uygulaması. iPhone, iPad ve Android
telefon/tablet desteklenir. Web sürümü yapılandırılmamıştır.

## Geliştirme

- Node.js 24 ve npm kullanılır; Expo SDK 58 ve React Native 0.88 sürümleri birbiriyle uyumludur.
- Bu çalışma ortamındaki ana checkout `/workspace/ikimiz` dizinidir. Eski checkout yedekleri
  geliştirme veya yayın kaynağı olarak kullanılmaz.
- Bağımlılıkları `npm ci --legacy-peer-deps` ile kurun; geliştirmeyi `npm start` ile başlatın.
- Native paket eklerken `npx expo install <paket>` kullanın. `ios/` ve `android/` klasörleri
  Expo tarafından üretilir; elle düzenlenmez.

```sh
npm run validate       # ESLint, TypeScript, uygulama testleri, PostgreSQL migration testleri
npm run format         # Ortak kod biçimini uygula
npm run format:check   # Kod biçimini denetle
npm run android        # Expo geliştirme sunucusunu Android için aç
npm run ios            # iOS simülatörü (macOS gerekir)
```

`npm run test:database` testleri PGlite üzerinde geçici bir PostgreSQL veritabanı oluşturur.
Canlı Supabase projesine bağlanmaz ve canlı verileri değiştirmez.

## Kod yapısı

| Dizin | Sorumluluk |
| --- | --- |
| `app/` | Expo Router ekranları ve gezinme |
| `src/components/` | Tekrar kullanılan kartlar, manzara, bitki ve arayüz bileşenleri |
| `src/hooks/` | Oturum, ortak eşleşme, konum/adım takibi ve ekran verileri |
| `src/services/` | Supabase sorguları, dosya deposu ve alan işlemleri |
| `src/utils/` | Yerel tarihler, yaklaşanlar, dosya okuma, ağ ve konum hesapları |
| `__tests__/` | İş kuralları, dosya okuma ve arayüz/oturum regresyon testleri |
| `supabase/` | Temel şema ve uygulanacak SQL dosyaları |

`AuthProvider` oturumu, `CoupleProvider` aktif eşleşmenin tek ortak kopyasını yönetir.
`CouplePresenceProvider` GPS ve sensör aboneliklerinin tek sahibidir. Konum yönünü
kapatmak otomatik adım sayımının konumunu silmez. Yön paylaşımı uygulama arka plana
gidince kapanır; izin penceresi gibi kısa iOS `inactive` durumlarında açık kalır.

Tarih anahtarları `localDateKey` / `parseLocalDate` ile yerel takvim günü olarak işlenir.
Günün şarkısı ve günlük kayıtlar gece yarısında yenilenir. Yaklaşanlar yalnızca bir hafta
içindeki kayıtları tarih/saat sırasıyla gösterir; sadece doğum günü ve yıl dönümü tekrar eder.

Fotoğraf, belge, ses ve sticker dosyaları `readFileBytes` ile okunur. Android `content://`
adresleri native dosya sistemi üzerinden açılır. Galeri/doküman/ses önizlemelerinin imzalı
bağlantıları dosya başına bir istek yerine toplu oluşturulur.

## Veritabanı

Kurulum ve güncelleme sırası [supabase/README.md](supabase/README.md) dosyasındadır.
Uygulama bundle'ında kullanılan Supabase anon anahtarı public istemci anahtarıdır;
erişim sınırlarını sunucudaki RLS politikaları belirler.

[Bu projenin SQL Editor sayfasını aç](https://supabase.com/dashboard/project/phrfepvdjebxfmfkhiju/sql/new).

## Önizleme yayını

`.github/workflows/shared-expo-update.yml` önce `npm run validate` çalıştırır. Kontroller
başarılıysa iOS ve Android güncellemelerini `shared-preview` Expo dalına yayınlar.

Önizleme bağlantısı `shared-preview` kanalına bağlıdır. Belirli bir `/group/<id>` bağlantısı
eski yayına sabitlenir; kalıcı kanal bağlantısı sonraki yayınları alır. Expo Go menüsündeki
**Reload / Yenile** ile güncel sürüm açılır.

Native paketlerin Expo Go'da bulunmayan sürümlerini kullanmak için yeni native derleme
gerekir. `eas.json` içindeki `preview` profili Android APK / iOS dahili dağıtımı üretir;
`production` profili mağaza derlemesi içindir.
