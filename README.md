# İkimiz

**İkimiz**, çiftlerin ortak hayatını tek ve sakin bir alanda düzenlemesi için geliştirilen Türkçe bir mobil uygulamadır. Takvim, listeler, notlar, görevler, hediye fikirleri ve hatırlatmalar gibi modüller aşamalı olarak eklenir. İlk aşamada hesap yönetimi, partner eşleşmesi, **Ortak Fotoğraf**, **Ekrana Not**, **Ruh Halim** ve **Öpücük** özellikleri bulunur.

- **Teknoloji:** React Native · Expo SDK 58 · React Native 0.88 · TypeScript · Expo Router · Supabase
- **Platformlar:** iPhone, iPad ve Android telefon/tablet — **web sürümü yoktur.**
- **Arayüz dili:** Türkçe

---

## İçindekiler

1. [Özellikler (Aşama 1)](#özellikler-aşama-1)
2. [Kurulum](#kurulum)
3. [Expo Go ile çalıştırma](#expo-go-ile-çalıştırma)
4. [Supabase bağlantısı](#supabase-bağlantısı)
5. [Supabase kurulumu](#supabase-kurulumu)
6. [Klasör yapısı](#klasör-yapısı)
7. [Tasarım sistemi](#tasarım-sistemi)
8. [Platform desteği](#platform-desteği)
9. [Aşama 2 yol haritası](#aşama-2-yol-haritası)

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
| Ruh Halim: günlük ruh hali, kısa not, ortak 30 günlük geçmiş | ✅ Çalışıyor |
| Öpücük: sabah ve akşam birer kez, partnere animasyonlu gönderim | ✅ Çalışıyor |
| Ortak Fotoğraf: iki telefonda gösterilen, partnerlerden biri tarafından değiştirilebilen fotoğraf | ✅ Çalışıyor |
| Uygulama içi bildirimler (okundu işaretleme, sekme rozeti) | ✅ Çalışıyor |
| Arama (kategoriler, ekran notları, bildirimler) | ✅ Çalışıyor |
| Profil düzenleme, çıkış, hesap silme | ✅ Çalışıyor |
| Takvim, Listeler, Notlar, Görevler, Hediye Radarı, Bilinmesi Gerekenler, Unutma! | 🕓 Bilgilendirici “Yakında” ekranı |

**Gezinme:** Alt menüde 5 sekme vardır: **Bugün · Ara · + · Bildirimler · Profil**. Ortadaki büyük yuvarlak **+** butonu hızlı ekleme menüsünü açar.

---

## Kurulum

Gereksinimler: **Node.js 20.19+**, npm ve telefonunuzda **Expo Go** uygulaması (SDK 58 uyumlu — App Store / Google Play'deki güncel sürüm).

```bash
git clone https://github.com/<kullanici-adiniz>/ikimiz.git
cd ikimiz
npm install
npx expo start
```

Faydalı komutlar:

```bash
npm run typecheck   # TypeScript kontrolü (tsc --noEmit)
npm test            # Servis doğrulama testleri (Jest)
npm run android     # Android emülatörü/cihazı ile başlat
npm run ios         # iOS simülatörü ile başlat (yalnızca macOS)
```

---

## Expo Go ile çalıştırma

Ortak yayımlanan önizlemeler `shared-preview` kanalından açılır. Kanal aynı adlı Expo güncelleme dalına bağlıdır; `scripts/shared-update-links.cjs` her yayında aynı kanal bağlantısını üretir. Bağlantıyı Expo Go'da bir kez açtıktan sonra yeni uyumlu sürümler Expo Go menüsündeki **Reload / Yenile** ile alınır. `/group/<kimlik>` içeren bağlantılar belirli bir yayına sabitlenir; bu bağlantılarda yenileme yeni yayın grubuna geçmez. İnternet bağlantısı yoksa Expo Go önbellekteki sürümü açabilir.

1. iPhone/iPad için App Store'dan, Android için Google Play'den **Expo Go** uygulamasını yükleyin.
2. Bilgisayarda `npx expo start` komutunu çalıştırın.
3. Terminalde çıkan QR kodu
   - **iOS:** Kamera uygulamasıyla,
   - **Android:** Expo Go içindeki “Scan QR code” ile okutun.
4. Telefon ve bilgisayar aynı ağda değilse `npx expo start --tunnel` kullanın.

> Not: Proje Expo SDK 58 kullanır; mağazadaki güncel Expo Go bu sürümü destekler. Expo Go ileride daha yeni bir SDK'ya geçerse proje de yükseltilmeli ya da EAS ile bir geliştirme derlemesi kullanılmalıdır.

---

## Supabase bağlantısı

Uygulama doğrudan Supabase projesine (`phrfepvdjebxfmfkhiju`) bağlanır. Expo Go `.env` dosyası okuyamadığından proje URL'si ve **anon (public)** anahtar `src/lib/supabase.ts` içine gömülüdür. Anon anahtar istemcide kullanılmak için tasarlanmıştır; veriler Row Level Security ile korunur. **service_role anahtarı asla uygulamaya eklenmemelidir.**

Yerel mock (demo) mod kaldırılmıştır; tüm veriler Supabase'de tutulur.

---

## Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun.
2. **SQL Editor → New query** açın, `supabase/schema.sql` dosyasının tamamını yapıştırıp **Run** deyin. Betik tekrar çalıştırılabilir.
3. **Authentication → Providers → Email** sağlayıcısının açık olduğundan emin olun. Hızlı test için “Confirm email” seçeneğini kapatabilirsiniz; açıksa kayıttan sonra doğrulama e-postası gerekir.
4. Başka bir Supabase projesi kullanacaksanız **Project Settings → API** sayfasındaki URL ve anon anahtarını `src/lib/supabase.ts` dosyasına yazın.
5. `npx expo start -c` ile uygulamayı yeniden başlatın.

Mevcut kuruluma **Ruh Halim** eklemek için `supabase/migrations/20261104_mood_entries.sql`, **Öpücük** için `supabase/migrations/20261104_kisses.sql`, **Ortak Fotoğraf** için `supabase/migrations/20261104_couple_photo.sql`, **Gezdiğimiz Yerler** için `supabase/migrations/20261104_travel_places.sql` ve `supabase/migrations/20261104_travel_place_notes.sql` dosyalarını Supabase SQL Editor'da çalıştırın. Bu ek kurulumlar mevcut verileri silmeden tabloları, Storage alanını ve erişim kurallarını oluşturur. Ruh hali ve not aktif partnerle paylaşılır; herkes yalnızca kendi kaydını değiştirebilir. Öpücük tablosu sabah/akşam haklarını ve partner uygulaması açıkken anlık animasyonu sağlar; partner daha sonra uygulamayı açarsa son 24 saatteki öpücük animasyonu gösterilir. Ortak fotoğrafını eşleşmedeki iki kullanıcı da değiştirebilir ve yalnızca aktif çift üyeleri görebilir. Gezdiğimiz Yerler kayıtları iki partnerin de haritasında görünür; ekleyen kişi kendi kaydını kaldırabilir.

**Şema özeti** — 20 tablo:

| Aşama 1 (aktif) | Aşama 2 (hazır) |
| --- | --- |
| `profiles`, `couples`, `couple_members`, `invitations`, `screen_notes`, `notifications`, `mood_entries`, `kisses`, `travel_places` | `calendar_events`, `important_dates`, `lists`, `list_items`, `note_folders`, `notes`, `tasks`, `reminders`, `gift_ideas`, `partner_facts`, `user_settings` |

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
│   ├── mood/                   # Günlük ruh hali ve ortak geçmiş
│   └── categories/[slug].tsx   # Geliştirme aşamasındaki kategoriler için "Yakında" ekranı
├── src/
│   ├── components/ui/          # Card, Button, Input, IconButton, EmptyState,
│   │                           # SectionHeader, Badge, Divider, Screen
│   ├── constants/              # theme.ts (tasarım token'ları), categories.ts
│   ├── hooks/                  # useAuth, useCouple, useScreenNotes, useAppState
│   ├── lib/                    # supabase.ts (Supabase istemcisi)
│   ├── services/               # authService, coupleService, screenNoteService, notificationService
│   ├── types/                  # Tüm TypeScript tipleri
│   └── utils/                  # Türkçe tarih biçimleri, "Yakında" bildirimi
├── supabase/schema.sql         # Veritabanı şeması + RLS
└── assets/                     # Simge ve açılış görseli
```

**Katmanlar:** Ekranlar yalnızca hook'ları kullanır → hook'lar servisleri çağırır → servisler Supabase ile konuşur. Yeni bir modül eklerken aynı düzen izlenir.

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
