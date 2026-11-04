# İkimiz

**İkimiz**, çiftlerin ortak hayatını tek ve sakin bir alanda düzenlemesi için geliştirilen Türkçe bir mobil uygulamadır. Takvim, listeler, notlar, görevler, hediye fikirleri ve hatırlatmalar gibi modüller aşamalı olarak eklenir. İlk aşamada hesap yönetimi, partner eşleşmesi ve **Ekrana Not** özelliği çalışır durumdadır.

- **Teknoloji:** React Native · Expo SDK 50 · TypeScript · Expo Router · Supabase
- **Platformlar:** iPhone, iPad ve Android telefon/tablet — **web sürümü yoktur.**
- **Arayüz dili:** Türkçe

---

## İçindekiler

1. [Özellikler (Aşama 1)](#özellikler-aşama-1)
2. [Kurulum](#kurulum)
3. [Expo Go ile çalıştırma](#expo-go-ile-çalıştırma)
4. [Ortam değişkenleri](#ortam-değişkenleri)
5. [Mock (demo) mod](#mock-demo-mod)
6. [Supabase kurulumu](#supabase-kurulumu)
7. [Klasör yapısı](#klasör-yapısı)
8. [Tasarım sistemi](#tasarım-sistemi)
9. [Platform desteği](#platform-desteği)
10. [Aşama 2 yol haritası](#aşama-2-yol-haritası)

---

## Özellikler (Aşama 1)

| Alan | Durum |
| --- | --- |
| E-posta ile kayıt, giriş, şifre sıfırlama | ✅ Çalışıyor |
| Google / Apple ile giriş | 🕓 Butonlar görünür, “Yakında” bilgisi verir |
| Partner davet kodu (6 hane) oluşturma ve paylaşma | ✅ Çalışıyor |
| Davet kodunu kabul etme / reddetme | ✅ Çalışıyor |
| Eşleşme durumu ve onaylı sonlandırma | ✅ Çalışıyor |
| Ekrana Not: metin + emoji + arka plan rengi, geçmiş | ✅ Çalışıyor |
| Uygulama içi bildirimler (okundu işaretleme, sekme rozeti) | ✅ Çalışıyor |
| Arama (kategoriler, ekran notları, bildirimler) | ✅ Çalışıyor |
| Profil düzenleme, çıkış, hesap silme | ✅ Çalışıyor |
| Takvim, Listeler, Notlar, Görevler, Hediye Radarı, Bilinmesi Gerekenler, Unutma! | 🕓 Bilgilendirici “Yakında” ekranı |

**Gezinme:** Alt menüde 5 sekme vardır: **Bugün · Ara · + · Bildirimler · Profil**. Ortadaki büyük yuvarlak **+** butonu hızlı ekleme menüsünü açar.

---

## Kurulum

Gereksinimler: **Node.js 18+**, npm ve telefonunuzda **Expo Go** uygulaması (SDK 50 uyumlu).

```bash
git clone https://github.com/<kullanici-adiniz>/ikimiz.git
cd ikimiz
npm install
npx expo start
```

Faydalı komutlar:

```bash
npm run typecheck   # TypeScript kontrolü (tsc --noEmit)
npm test            # Mock mod servis akışı testleri (Jest)
npm run android     # Android emülatörü/cihazı ile başlat
npm run ios         # iOS simülatörü ile başlat (yalnızca macOS)
```

---

## Expo Go ile çalıştırma

1. iPhone/iPad için App Store'dan, Android için Google Play'den **Expo Go** uygulamasını yükleyin.
2. Bilgisayarda `npx expo start` komutunu çalıştırın.
3. Terminalde çıkan QR kodu
   - **iOS:** Kamera uygulamasıyla,
   - **Android:** Expo Go içindeki “Scan QR code” ile okutun.
4. Telefon ve bilgisayar aynı ağda değilse `npx expo start --tunnel` kullanın.

> Not: Expo Go'nun SDK 50 ile uyumlu sürümü gerekir. Mağazadaki Expo Go daha yeni bir SDK'yı destekliyorsa projeyi bir geliştirme derlemesiyle (`npx expo run:ios` / `npx expo run:android`) çalıştırabilirsiniz.

---

## Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın:

```bash
cp .env.example .env
```

| Değişken | Açıklama |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase proje adresi (Project Settings → API) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase “anon public” anahtarı |

`.env` dosyası `.gitignore` içindedir; depoya eklenmez. Değişiklikten sonra Metro'yu `npx expo start -c` ile önbelleği temizleyerek yeniden başlatın.

---

## Mock (demo) mod

İki değişkenden biri boşsa uygulama **otomatik olarak mock modda** açılır; Supabase gerekmez.

- Tüm veriler cihazda **AsyncStorage** içinde saklanır (`src/lib/mock-store.ts`).
- Hoş geldin ve giriş ekranlarında **“Test Kullanıcısı ile Devam Et”** butonu görünür (`test@ikimiz.app` / `123456`).
- Tek cihazda eşleşmeyi denemek için: **Profil → Eşleşme durumu → Partner Davet Et → Davet Kodu Oluştur → “Partner Kabulünü Simüle Et”**. “Deniz” adlı demo partner daveti kabul eder ve size bir karşılama notu bırakır.
- **Profil → Demo verilerini sıfırla** ile cihazdaki tüm demo veriler silinir.
- Profil ekranındaki “Veri kaynağı” satırı hangi modda olduğunuzu gösterir.

---

## Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun.
2. **SQL Editor → New query** açın, `supabase/schema.sql` dosyasının tamamını yapıştırıp **Run** deyin. Betik tekrar çalıştırılabilir.
3. **Authentication → Providers → Email** sağlayıcısının açık olduğundan emin olun. Hızlı test için “Confirm email” seçeneğini kapatabilirsiniz; açıksa kayıttan sonra doğrulama e-postası gerekir.
4. **Project Settings → API** sayfasındaki URL ve anon anahtarını `.env` dosyasına yazın.
5. `npx expo start -c` ile uygulamayı yeniden başlatın.

**Şema özeti** — 17 tablo:

| Aşama 1 (aktif) | Aşama 2 (hazır) |
| --- | --- |
| `profiles`, `couples`, `couple_members`, `invitations`, `screen_notes`, `notifications` | `calendar_events`, `important_dates`, `lists`, `list_items`, `note_folders`, `notes`, `tasks`, `reminders`, `gift_ideas`, `partner_facts`, `user_settings` |

- Her tabloda ortak sütunlar bulunur: `id`, `created_at`, `updated_at`, `owner_id`, `couple_id`, `visibility` (`personal` | `shared`), `is_deleted`.
- Tüm tablolarda **Row Level Security** açıktır; her tablonun üzerinde erişim kuralı yorum olarak açıklanmıştır.
- `calendar_events`, `tasks` ve `reminders` tabloları tekrar için **`rrule_string`** (RFC 5545 RRULE) kullanır.
- Eşleşme işlemleri güvenlik için sunucu tarafı fonksiyonlarla yapılır: `accept_invitation`, `reject_invitation`, `end_couple`, `delete_my_account`.
- Dosyanın sonunda yeni modüller eklemek için bir **genişletilebilirlik notu** bulunur.

---

## Klasör yapısı

```
ikimiz/
├── app/                        # Expo Router ekranları
│   ├── _layout.tsx             # Kök layout: AuthProvider + oturum yönlendirmesi
│   ├── (auth)/                 # welcome, login, register, forgot-password
│   ├── (tabs)/                 # index (Bugün), search, add (+), notifications, profile
│   ├── couple/                 # invite, accept, status
│   ├── screen-note/            # compose, history
│   └── categories/[slug].tsx   # Geliştirme aşamasındaki kategoriler için "Yakında" ekranı
├── src/
│   ├── components/ui/          # Card, Button, Input, IconButton, EmptyState,
│   │                           # SectionHeader, Badge, Divider, Screen
│   ├── constants/              # theme.ts (tasarım token'ları), categories.ts
│   ├── hooks/                  # useAuth, useCouple, useScreenNotes, useAppState
│   ├── lib/                    # supabase.ts (client + mock algılama), mock-store.ts
│   ├── services/               # authService, coupleService, screenNoteService, notificationService
│   ├── types/                  # Tüm TypeScript tipleri
│   └── utils/                  # Türkçe tarih biçimleri, "Yakında" bildirimi
├── supabase/schema.sql         # Veritabanı şeması + RLS
├── assets/                     # Simge ve açılış görseli
└── .env.example
```

**Katmanlar:** Ekranlar yalnızca hook'ları kullanır → hook'lar servisleri çağırır → servisler mock modda `mock-store`, gerçek modda Supabase ile konuşur. Yeni bir modül eklerken aynı düzen izlenir.

---

## Tasarım sistemi

Tüm değerler `src/constants/theme.ts` içindedir.

- **Renkler:** zemin `#FAF8F5`, kart `#FFFFFF`, vurgu (adaçayı) `#7D9B76`, vurgu açık `#E8F0E6`, bej `#F0EBE3`, toprak `#C4A882` / `#A67C5B`, metin `#2D2D2D` / `#6B6B6B` / `#9E9E9E`, kenarlık `#E8E3DC`, hata `#C0392B`
- **Köşe yarıçapı:** kart 12 · buton/input 8 · hap/etiket 20
- **Yazı boyutları:** 11 · 13 · 15 · 17 · 20 · 24 · 30 (sistem fontu)
- **İkonlar:** `@expo/vector-icons` Feather
- **Gölge:** hafif (elevation 2, opaklık 0.1)

---

## Platform desteği

| Platform | Durum |
| --- | --- |
| iPhone | ✅ |
| iPad | ✅ (`supportsTablet: true`; içerik en fazla 600pt genişlikte ortalanır) |
| Android telefon ve tablet | ✅ |
| Web | ❌ Desteklenmez (bilinçli tercih) |

Tablet uyumu `useWindowDimensions` ile sağlanır: geniş ekranlarda içerik ortalanır ve ana ekrandaki kategori ızgarası 2 yerine 4 sütuna geçer.

---

## Aşama 2 yol haritası

1. **Takvim & Önemli Günler** — ortak/kişisel etkinlikler, yıl dönümleri, RRULE ile tekrar
2. **Listeler** — market, film, seyahat; maddeleri birlikte işaretleme
3. **Notlar** — klasörler, kişisel/ortak görünürlük
4. **Görevler** — partnere atama, son tarih, tekrarlayan görevler
5. **Hediye Radarı** — partnerden gizli hediye fikirleri
6. **Bilinmesi Gerekenler** — ölçüler, alerjiler, sevdiği şeyler
7. **Unutma!** — zamanlı ve tekrarlayan hatırlatmalar
8. **Push bildirimleri** (Expo Notifications + Supabase Edge Function) ve sessiz saatler
9. **Gerçek zamanlı güncellemeler** (Supabase Realtime) — yeni ekran notlarının anında görünmesi
10. **Google ve Apple ile giriş**
11. **Yaklaşanlar kartının** takvim, görev ve hatırlatmalardan beslenmesi

---

## EAS Build ile bilgisayarsız test

Uygulama Expo'nun bulut derleme servisi **EAS Build** ile derlenip telefonunuza veya tabletinize doğrudan yüklenebilir. Proje ayarları `eas.json` dosyasındadır.

| Profil | Ne üretir | Ne zaman kullanılır |
| --- | --- | --- |
| `preview` | Android **APK**, iOS dahili dağıtım | Telefona doğrudan kurup denemek için (**önerilen**) |
| `development` | Geliştirme istemcisi (APK / iOS) | Kod geliştirirken. Önce `npx expo install expo-dev-client` gerekir. |
| `production` | Android **AAB**, iOS mağaza derlemesi | Google Play / App Store yayını için |

### Android (APK)

1. [expo.dev](https://expo.dev) adresine gidin ve **Gmail hesabınızla** giriş yapın.
2. Sol menüden **Projects** bölümünde **ikimiz** projesini bulun. Proje yoksa **New Project** ile `ikimiz` adında bir proje oluşturun ve bu GitHub reposunu (`eyucedag/ikimiz`) bağlayın. Proje bağlandığında `app.json` içindeki `extra.eas.projectId` alanı dolar.
3. Projede **Builds** sekmesine gidin, **New Build**'e tıklayın, platform olarak **Android**, profil olarak **preview** seçin.
4. Derleme yaklaşık 10–15 dakika sürer. Bitince sayfada **APK indirme bağlantısı** ve QR kod görünür.
5. Android telefonunuzda bağlantıyı açıp APK'yı indirin ve kurun. Telefon “bilinmeyen kaynaklardan yükleme” izni isteyebilir (**Ayarlar → Uygulamalar → Bilinmeyen uygulamaları yükle**).

Bilgisayar kullanmak isterseniz aynı işlem komut satırından da yapılabilir:

```bash
npm install -g eas-cli
eas login
eas init                    # projeyi expo.dev'e bağlar, projectId'yi doldurur
npm run eas:build:android   # = eas build --platform android --profile preview
```

### iPhone / iPad

- expo.dev'de **Builds → New Build → iOS → preview** (dahili dağıtım, *Internal Distribution*) seçin.
- Bunun için **ücretli bir Apple Developer hesabı** gerekir. EAS, Apple hesabınızla giriş yapmanızı ister ve cihazınızı kayıt için bir bağlantı verir. Cihazın kaydı tamamlanmadan derleme kurulamaz.
- Apple hesabınız yoksa iPhone/iPad'de test etmenin en kolay yolu **Expo Go** ile denemektir (bkz. [Expo Go ile çalıştırma](#expo-go-ile-çalıştırma)).

> Not: `app.json` içindeki `owner` alanı `eceyucedag` olarak ayarlandı. expo.dev'deki kullanıcı adınız farklıysa bu alanı kendi kullanıcı adınızla değiştirin, aksi halde derleme “owner” hatası verir.
