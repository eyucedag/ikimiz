# İkimiz — Uygulama Özellikleri ve Çalışma Biçimi

Bu belge, **mevcut İkimiz uygulamasını** anlatır. Amaç, uygulamanın hangi ekranlara ve özelliklere sahip olduğunu, bu özelliklerin kullanıcı açısından nasıl çalıştığını ve ortak verinin nasıl korunup senkronize edildiğini uzun ve açık biçimde açıklamaktır. Görsel tema ve renk tercihleri bu belgenin kapsamına girmez.

## Uygulamanın amacı

İkimiz, iki partnerin davet koduyla eşleşip günlük hayatlarını aynı ortak alanda düzenlemesini sağlar. Takvim, özel günler, listeler, notlar, fotoğraf ve belgeler, sesli anılar, ruh halleri, günlük şarkı, görevler ve romantik etkileşimler tek uygulamada bir araya gelir. Telefon ve tabletlerde iOS ve Android için geliştirilmiştir.

Uygulamada **kişisel kayıt özelliği yoktur**. Eklenen içerik çifte ait ortak kayıttır. Bir kaydı hangi partnerin eklediği gösterilebilir; ekleyen bilgisi kaydı kişiselleştirmez ve yetkileri ayırmaz. Her iki partner de ortak içerikleri görüntüleyebilir, düzenleyebilir ve silebilir. Bu kural içerik veritabanı ve dosya depolama izinlerinde de geçerli olmalıdır.

## Hesap açma ve partnerle eşleşme

Uygulama e-posta ve parola ile hesap oluşturma ve oturum açma akışlarına sahiptir. Parola sıfırlama bağlantısı e-posta ile gönderilir. Profilde tam ad ve uygulamada partnere gösterilen ad bulunur; kullanıcı bu bilgileri düzenleyebilir. Google ve Apple ile giriş seçenekleri ekranda yer alır, ancak sağlayıcı yapılandırması tamamlanmadıysa kullanılabilir kabul edilmemelidir.

Partner eklemek için altı karakterli davet kodu oluşturulur ve paylaşım menüsüyle gönderilir. Davet edilen kişi kodu girerek kabul veya ret verir. Davet bekleme, iptal ve kabul durumları uygulamada izlenir. Eşleşme tamamlanınca çift için ortak alan oluşur ve iki üye bu alandaki içerikleri birlikte kullanır. Eşleşme Ayarlar bölümünden sonlandırılabilir; işlem öncesinde ortak alana erişimin değişeceği açıklanıp onay alınır.

İlişki başlangıç zamanı ayarlanabilir. Ana ekrandaki sayaç bu tarihten beri geçen süreyi gün, saat, dakika ve saniye olarak gösterir. Eşleşme ve profil durumu uygulama açıkken gerçek zamanlı yenilenir; bağlantı kesintisinden sonra da yeniden yüklenir.

## Ana gezinme

Alt gezinme beş ana bölüme erişim sağlar:

- **Bugün:** İlişkinin ve ortak kategorilerin özeti.
- **Kategoriler:** Özellik ekranlarına giden ikon ızgarası.
- **Ekle (+):** Sık kullanılan yeni kayıt akışlarına hızlı erişim.
- **Bildirimler:** Partner ve uygulama içi bildirimler; sekme üzerinde okunmamış sayısı gösterilebilir.
- **Ayarlar:** Profil, partner/eşleşme, ilişki tarihi, görünüm, oturum ve hesap işlemleri.

İç ekranlarda üst başlık, geri gezinme, kaydırma ve yenileme davranışı bulunur. Yerleşimler sabit tek telefon ölçüsüne bağlanmaz; iPhone, Android telefon, iPad ve Android tabletlerde dikey/yatay yön ve kullanılabilir genişliğe göre uyarlanır.

## Bugün ana ekranı

Bugün ekranı modüllere yalnızca bağlantı veren bir menü değil, ortak verilerden kısa özetler gösteren ana çalışma alanıdır. Kullanıcı özet kartlarından ilgili içeriğe gider ve desteklenen işlemleri başlatır.

### Üst bölüm, sayaç ve çift fotoğrafı

- Günün saatine uygun selamlama ve yerel tarih gösterilir.
- İlişki süresi üst alanda görünür; sayaç sürekli güncellenir.
- Çift fotoğrafı yüklenebilir ve değiştirilebilir. Fotoğraf ortak depoda tutulur ve yalnızca eşleşmiş çift üyeleri açabilir.
- Öpücük gönderme ve ana ekran kartlarını düzenleme gibi hızlı kontroller üst alanda yer alabilir.

### Manzara ve “Aşkım nerdesin?”

Manzara görseli günün saatine göre görünüm değiştirir. “Aşkım nerdesin?” kontrolü, kullanıcı dokunduğunda konum yönü paylaşımını başlatır. Uygulama açılır açılmaz konum servisini etkinleştirme penceresi çıkarmaz.

Konum izni reddedilirse veya telefonun konum servisi kapalıysa kullanıcıya açıklama gösterilir; uygulama açık kalır ve diğer ekranlar çalışır. Konum izni penceresinin kısa süreli sistem durum değişiklikleri paylaşımı kapatıp yeniden açma döngüsü oluşturmamalıdır. Yön paylaşımı kullanıcı tarafından durdurulur ve uygulama arka plana geçince sonlandırılır. Eski konum güncelmiş gibi gösterilmez. Adım sayımı GPS yön paylaşımından ayrı çalışır.

### Ortak bitki ve raf

Çift, **Kalp kalbe karşı**, **Menekşe** veya **Kaktüs** bitkilerinden birini seçer. Bitki seçimi, sulama durumu ve bitki sağlığı çifte aittir; iki partner de bitkiyi değiştirebilir ve sulayabilir. Bitki görseline basıldığında sulama ve bitki seçimi seçenekleri açılır. Sulama animasyonu saksının toprağına hizalanır.

Bitki sağlığı zaman içindeki sulamaya göre değişir. Kuruma ve toparlanma kademelidir; kaktüs diğer türlere göre daha dayanıklıdır. Raf kompozisyonunda bitki türleri aynı yerleşim standardını kullanır. Kitaplar alt rafta bulunur; sarkan dallar kitapların okunmasını ve rafın görünmesini engellemez. Kitap rafına basmak okunacak kitaplar listesine götürür.

### Yaklaşanlar

Yaklaşanlar, takvim etkinliklerini ve özel günleri bir arada özetler. Bugünden itibaren en fazla yedi günlük aralıkta olan kayıtlar gösterilir ve en yakın tarih/saat üstte yer alır. Doğum günleri ve yıl dönümleri yıllık tekrar eder. Yerel takvim tarihi kullanılır; saat dilimi nedeniyle tarih bir gün kaymamalıdır. Her satır kendi etkinlik/özel gün ekranına gider.

### Zengin kategori kartları

Ana ekrandaki kartlar kategorinin içeriğine göre bilgi ve eylem gösterir. Örnek davranışlar:

- **Galeri:** Son fotoğrafları küçük görseller halinde gösterir; dokunma galeriye gider.
- **Günün Şarkısı:** Partnerlerin bugünkü şarkılarını ve dinleme/ekleme eylemlerini gösterir.
- **Listeler:** Öne çıkan listeyi, tamamlanan madde sayısını ve ilerlemeyi özetler. Kitap listesi varsa adı ve ilerlemesi gösterilir.
- **Takvim:** Sıradaki etkinliğin başlık, saat ve konum bilgisini gösterir.
- **Partnerinden Not:** Son ortak ekran notunu, göndereni ve zamanını; not yazma/geçmiş eylemlerini gösterir.
- **Ruh Halim:** İki partnerin bugünkü emoji ve duygu durumunu gösterir.
- **Dokümanlar, Sesli Anılar, Görevler, Hediye Radarı, Bilinmesi Gerekenler, Gezdiğimiz Yerler, Birlikte Atılan Adımlar ve Özel Günler:** O kategoriye ait güncel içerik özetini gösterir.

### Ana ekranı kişiselleştirme

Kullanıcı ana ekran kartlarının sırasını düzenleyebilir ve her kategoriyi ayrı ayrı gizleyip gösterebilir. Sıralama yukarı/aşağı kontrolleriyle yapılır; sürükle-bırak ve uzun basma ile sıralama yoktur. Tek bir kontrol bütün kategorileri gizlemez. Yaklaşanlar da kategori gibi sıralanıp gizlenebilir. Bu tercih yalnızca ana ekran görünümünü etkiler, ortak içerik kayıtlarını etkilemez.

## Kategoriler ekranı

Kategoriler ekranında “Kategoriler” başlığı ve uygulama özelliklerinin ikonları bulunur. İkonlar kompakt, çerçevesiz ızgarada yer alır; ekran genişledikçe yan yana daha çok kategori gösterilir. Büyük manzara üst alanı ve “Birlikte alanlarınız” başlığı kullanılmaz. Her ikon/etiket ilgili kategori ekranını açar.

Kategoriler şunlardır: Takvim, Özel Günler, Listeler, Not Defteri, Dokümanlar, Galeri, Sesli Anılar, Görevler, Partnerinden Not/Ekrana Not, Günün Şarkısı, Hediye Radarı, Bilinmesi Gerekenler, Gezdiğimiz Yerler, Birlikte Atılan Adımlar ve Ruh Halim. Yaklaşanlar ana ekranda ayrı bir kategori kartı olarak yer alır. Öpücük, hızlı romantik eylem olarak sunulur.

## Kategori özellikleri

### Takvim

Aylık görünümde önceki/sonraki aya geçilir ve gün seçilir. Seçilen tarihteki etkinlikler listelenir. Etkinlikte başlık, tarih/saat veya tüm gün bilgisi ve isteğe bağlı konum bulunur. Etkinlik ekleme, düzenleme ve silme iki partnere de açıktır. Saatli etkinlikler zaman sırasıyla görünür; tüm gün etkinlikleri doğru tarih altında gösterilir.

### Özel Günler

Özel gün başlığı, tarih ve tür eklenir. Türler doğum günü, yıl dönümü ve diğer özel gündür. Doğum günü ve yıl dönümü sonraki yıllara taşınır; diğer tür bir defalık olabilir. İlişki başlangıç tarihi sayaçta ve özel gün özetinde kullanılır. Her iki partner tüm kayıtları düzenleyebilir ve silebilir.

### Listeler ve kitaplar

Ortak listeler market, film, seyahat, istek veya genel amaçla oluşturulabilir. Liste maddesi eklenir, tamamlandı olarak işaretlenir veya kaldırılır. Liste adı ve içindeki tüm maddeler ortak içeriktir; iki partner listeyi ve maddeleri düzenleyip silebilir. Kitaplar okunacak ortak kitap listesi olarak tutulabilir; madde tamamlanma/okundu durumu işaretlenir. Ana ekran rafındaki kitaplara dokunmak bu listeyi açar.

### Not Defteri

Başlık ve metin içeren ortak notlar saklanır. Not listesi, son güncellenme bilgisi ve not ayrıntısı bulunur. Not ekleme, okuma, düzenleme ve silme her iki partner için açıktır. Kişisel not veya kişisel klasör yoktur.

### Dokümanlar ve bağlantılar

Dosya seçildikten sonra kullanıcı yüklemeden önce görünen adı yazar veya düzenler. Seçim dosyayı otomatik yüklemez; yükleme kullanıcı onayıyla başlar. Görünen ad daha sonra değiştirilebilir. Desteklenen dosyalar PDF, Word ve yapılandırılmış görsel biçimleridir; mevcut ekranda tek dosya için 25 MB sınırı belirtilir.

Dosya kartında ad, tür, boyut ve tarih görünür; dosya açılır/indirilir, adı düzenlenir veya silinir. Bağlantı kaydı görünen ad ve `http`/`https` adresinden oluşur; açma, kopyalama, düzenleme ve silme mümkündür. Tüm bu işlemleri iki partner de yapabilir. Dosyalar herkese açık tutulmaz; ortak üyelik kontrolünden geçen kısa ömürlü erişim bağlantısı kullanılır. Android dosya seçicinin `content://` URI biçimi desteklenir.

### Galeri

Telefon kütüphanesinden fotoğraf seçilip çiftin özel deposuna yüklenir. Fotoğraf için açıklama ve çekim tarihi tutulabilir; mevcutsa fotoğrafın EXIF tarih bilgisi kullanılır. Izgarada küçük görseller, dokununca tam ekran görüntüleme sunulur. İki partner de fotoğraf açıklamasını/tarihini düzenleyebilir ve fotoğrafı silebilir.

### Sesli Anılar

Mikrofon izni kayıt başlatılırken istenir. Kayıt başlatılır, durdurulur, dinlenir ve başlıkla ortak alana kaydedilir. Kayıt süresi en fazla üç dakikadır. Her iki partner kayıtları dinleyebilir, başlığını düzenleyebilir ve silebilir. İzin veya yükleme hatası uygulamanın kapanmasına yol açmaz.

### Ruh Halim

Her partner her gün bir duygu paylaşabilir ve isteğe bağlı kısa not ekleyebilir. Duygular: Harika 🤩, İyi 😊, İdare eder 😐, Keyifsiz 😔, Zorlanıyorum 😣, Yorgunum 😴, Enerjik 💪, Kızgın 😡 ve Sıkılmış 😒. Günlük kayıt güncellenebilir; aynı kişi için aynı gün yinelenen kayıt oluşturulmaz. Not en fazla 280 karakterdir.

Ekran bugünkü kendi kaydını düzenleme olanağı ve partnerin bugünkü paylaşımını gösterir. Son 30 günün paylaşımları geçmişte listelenir. Ana ekran kartı iki partnerin duygu etiketini ve emojisinin özetini gösterir. Ruh hali kaydı çift alanında görünür; kişisel kayıt değildir.

### Partnerinden Not / Ekrana Not

En fazla 140 karakterlik kısa not, isteğe bağlı emoji ve arka plan seçimiyle partnere gönderilir. Not partnerin Bugün ekranında görünür ve geçmiş ekranında saklanır. Görsel/sticker eklenmişse özel ortak dosya alanında tutulur. Okunma zamanı gönderene gösterilebilir. İki partner de notu düzenleyip silebilir. Not veya öpücük animasyonu ekrandayken arkadaki kontroller dokunma alamaz.

### Günün Şarkısı

Her yerel takvim günü için iki partner de kendi şarkı seçimini ekleyebilir. İki seçim aynı günde yan yana bulunur; biri diğerinin kaydını ezmez. Şarkı adı, sanatçı ve isteğe bağlı dinleme bağlantısı tutulur. Her iki partner şarkı bilgisini düzenleyebilir veya silebilir. Uygun bağlantıda dış müzik/video sayfası açılır; desteklenen bağlantılarda uygulama içinden dinleme sağlanabilir. Bağlantı metaverisi bulunamazsa alanlar elle doldurulur.

### Görevler

Ortak görev başlık ve tamamlanma durumuyla listelenir. İki partner görev ekleyebilir, düzenleyebilir, tamamlandı işaretleyebilir ve silebilir. Tekrarlama veya görev atama desteklendiği yerde açık alanlarla ifade edilir; ekleyen kullanıcı diğer partnerin yetkisini kısıtlamaz.

### Hediye Radarı

Hediye fikri, isteğe bağlı fiyat ve bağlantıyla kaydedilir. Bu sürümün ortak içerik kuralına göre fikir iki partner tarafından da görülebilir, düzenlenebilir ve silinebilir. Kişisel veya ekleyenden gizli kayıt davranışı yoktur.

### Bilinmesi Gerekenler

Başlık ve değer biçiminde önemli bilgiler saklanır; örneğin alerji, ölçü veya sevilen şeyler. Kayıtlar çiftin ortak alanındadır ve iki partner tarafından eklenip düzenlenip silinebilir.

### Gezdiğimiz Yerler

Birlikte ziyaret edilen şehir/ülke, ziyaret tarihi, isteğe bağlı not ve harita koordinatı eklenir. Haritada işaret ve ziyaret listesi görüntülenir. Her iki partner ziyaret kaydını ekleyebilir, düzenleyebilir veya silebilir. Harita sağlayıcısı kullanılamıyorsa liste çalışmaya devam eder.

### Birlikte Atılan Adımlar

Telefonun adım sensörü destekliyorsa günlük adım sayısı okunup çift alanında gösterilir. Kişi başı günlük sayı ve birlikte toplam görülebilir. İzin veya cihaz desteği yoksa açıklama verilir. Bu özellik GPS yön paylaşımından ayrıdır. İki partner ortak adım kayıtlarını görüntüler; düzeltme/silme yetkileri eşittir.

### Öpücük

Partner istediği zaman animasyonlu öpücük gönderir. Alıcı uygulamadaysa animasyon ekranın üst katmanında görünür; kapanana kadar alttaki ekran etkileşime kapalıdır. Aynı gelen öpücük tekrar tekrar gösterilmez. Partner bildirimi saatlik sınırlanabilir; bu sınırlama animasyonun uygulama içinde alınmasını engellemez.

## Hızlı Ekle, bildirimler ve ayarlar

**Hızlı Ekle**, desteklenen takvim etkinliği, özel gün, liste, ekran notu ve diğer yeni kayıt akışlarına kısayol verir. Çalışmayan bir seçenek aktifmiş gibi sunulmaz.

**Bildirimler** ekranı uygulama içi bildirimleri, okunmamış durumunu, tümünü okundu işaretlemeyi ve bildirime dokununca ilgili bölüme geçişi sağlar. Partner daveti, eşleşme, öpücük, ekran notu ve ilgili özellik olayları bildirim oluşturabilir. Sistem push izni yoksa uygulama içi bildirimler kullanılabilir durumda kalır. Bildirim alıcıya özeldir; ortak içeriklerin sahipliğini veya düzenleme yetkisini değiştirmez.

**Ayarlar** bölümünde profil düzenleme, partner/davet durumu, ilişki başlangıç tarihini değiştirme, görünüm tercihleri, oturum kapatma, eşleşmeyi sonlandırma ve hesabı silme bulunur. Hesap silme ve eşleşme sonlandırma açık onay ister. Görünüm tercihleri yalnızca cihazdaki görüntüyü değiştirir, kayıtların ortaklık durumunu değiştirmez.

## Ortak içerik ve yetki modeli

Ortak içerik kayıtları etkin bir `couple_id` ile çift alanına bağlanır. `owner_id` veya ekleyen bilgisi tutuluyorsa yalnızca kaydı kimin oluşturduğunu ve gerektiğinde denetim geçmişini belirtir. Bu alan düzenleme veya silme yetkisinde koşul olarak kullanılamaz.

Her iki etkin çift üyesi için içerik izinleri aynıdır:

- Ortak çift kayıtlarını ve dosyalarını görüntüleyebilir.
- Herhangi bir partnerin eklediği kaydı düzenleyebilir.
- Herhangi bir partnerin eklediği kaydı silebilir.
- Dosya/galeri/ses gibi içeriğe bağlı nesneleri açabilir ve ortak kaydın yaşam döngüsüyle birlikte yönetebilir.

Bu kurallar takvim, özel gün, liste, liste maddesi, not, görev, belge, bağlantı, fotoğraf, ses kaydı, ruh hali, ekran notu, şarkı, hediye fikri, önemli bilgi, ziyaret, bitki ve diğer tüm çift içeriklerine uygulanır. Kişisel görünürlük, kişisel liste ve kişisel not kapsam dışıdır. Başka bir çiftin üyeleri kayda veya depolama dosyasına erişemez.

Hesap oturumu, parola, davet kodu ve kişiye yöneltilen bildirim gibi kimlik/sistem verileri doğal olarak hesapla ilişkilidir; bunlar kişisel içerik özelliği değildir ve ortak kayıtların eşit yönetim kuralını değiştirmez.

## Veri, senkronizasyon ve güvenlik

Uygulama Expo/React Native, TypeScript ve Expo Router üzerine kuruludur. Oturum ve ortak veriler Supabase Auth ve PostgreSQL ile; dosyalar Supabase Storage ile; anlık güncellemeler Supabase Realtime ile çalışır. Servis dosyaları ekranlardan veri işlemlerini ayırır; hooks ortak oturum, eşleşme, ruh hali, konum ve uygulama durumunu yönetir.

Temel veri alanları profil, çift, çift üyeliği, davet, takvim etkinliği, önemli tarih, liste/madde, not, belge/bağlantı, fotoğraf, ses kaydı, ruh hali, ekran notu, günlük şarkı, görev, hediye fikri, önemli bilgi, ziyaret, konum/adım, bitki, öpücük ve bildirimdir. Ortak içerik tablolarında çift bağı zorunludur.

Row Level Security (RLS) ve Storage politikaları her istekte oturum sahibinin ilgili etkin çiftin üyesi olduğunu doğrular. Politika yalnızca kaydı oluşturan kullanıcıya düzenleme/silme izni vermez; aynı çiftteki iki partnerin yetkisi eşittir. Uygulama istemcisinde servis rol anahtarı bulunmaz. Depolama kovaları özeldir ve dosyalar süreli imzalı bağlantıyla açılır.

Gün bazında tutulan şarkı, ruh hali ve adım kayıtlarında yerel gün anahtarı kullanılır. Saatli takvim etkinlikleri zaman damgası ve yerel saat dilimiyle ele alınır. Uygulama gece yarısında bugünkü verileri yeniler. Eşleşme, şarkı, öpücük, not, liste ve benzeri canlı alanlarda Realtime kullanılır; bağlantı koparsa ön plana dönünce veya kontrollü yenilemeyle veri eşitlenir.

İşlem başarısız olursa arayüz başarı olmuş gibi davranmaz. Eski istek sonucunun güncel ekranı ezmesini önleyen istek korumaları, hata/boş/yükleniyor durumları ve yinelenen kayıt önlemleri bulunur. Android `content://` adresleri dosya içeriğine çevrilerek okunur. Tarihler yerel gün sınırlarında test edilir.

## İzin ve hata davranışları

- Konum izni yalnızca yön özelliği başlatılınca istenir; reddetmek uygulamayı kapatmaz veya uyarıyı döngüye sokmaz.
- Konum servisi kapalıysa kullanıcıya durumu anlatılır; arka planda servisi tekrar tekrar etkinleştirme denenmez.
- Fotoğraf kütüphanesi ve mikrofon izinleri ilgili özellik seçildiğinde istenir.
- İzin reddi, Android dosyasının okunamaması, bozuk fotoğraf metaverisi, ağ kesintisi, süresi dolan imzalı URL, boş kayıt veya eksik veritabanı kurulumu tüm uygulamayı çökertmez.
- Yükleme sırasında bekleme ve başarısızlık durumu görünür; kullanıcı dosya adını onaylamadan doküman yüklenmez.
- İki partner aynı anda değişiklik yaparsa sunucu sonucu tutarlı biçimde uygulanır; sessizce eski veri yazılmaz.

## Test ve kalite beklentileri

Yetki testleri özellikle şunları doğrular: A kaydı ekler; B görür, düzenler ve siler; A cihazında değişiklik görünür; farklı çifte bağlı C bu içeriğe erişemez. Aynı test dosya depolama nesneleri için de uygulanır.

Diğer önemli test başlıkları:

- Davet kabul/ret/iptal ve eşleşme durumu.
- Yaklaşanlar için yedi günlük aralık, tarih sırası, tekrarlayan doğum günü/yıl dönümü ve yerel saat.
- Ruh hali seçenekleri, günlük kayıt ve not uzunluğu.
- İki partnerin aynı gün ayrı şarkı eklemesi ve ortak düzenleme/silmesi.
- Android dosya URI, tür/boyut denetimi, görünen ad düzenleme ve yükleme hatası.
- Bitki türü dayanıklılık, sulama ve kademeli iyileşme.
- Konum izni reddi/kabulü, uygulama arka planı ve konum paylaşımının kararlı durması.
- Realtime olaylarının yinelenmemesi, çift cihazda düzenleme ve silme.
- Küçük telefon ve tabletlerde yatay/dikey ekran taşması olmaması.

Geliştirme kontrolleri lint, TypeScript, uygulama testleri ve geçici PostgreSQL ortamındaki migration/veritabanı testlerini kapsar. Veritabanı testleri canlı Supabase verisini değiştirmez. Canlı SQL migration uygulaması, kod/Expo önizleme yayını ve mağaza derlemesi birbirinden ayrı işlemlerdir.

## Uygulama kaynak yapısı

- `app/`: Expo Router ekranları ve yönlendirme.
- `src/components/`: ortak arayüz parçaları, kartlar, manzara, bitki ve öpücük katmanı.
- `src/hooks/`: oturum, eşleşme, ruh hali, bildirim, konum ve ekran verisi durumu.
- `src/services/`: Supabase tabloları, RPC, Storage ve özellik işlemleri.
- `src/utils/`: yerel tarih, yaklaşanlar hesabı, dosya okuma, URL, konum ve asenkron yardımcılar.
- `src/constants/`: kategori, ruh hali ve uygulama yapılandırma sabitleri.
- `supabase/schema.sql` ve `supabase/migrations/`: veritabanı şeması ve özellik değişiklikleri.
- `__tests__/`: servis, tarih, yetki davranışı, platform dosya erişimi ve arayüz regresyon testleri.

Migration dosyaları gelişigüzel sırayla çalıştırılmaz; `supabase/README.md` içindeki bağımlılık sırası izlenir. Uygulama kodunun yayınlanması SQL migration'larını canlı veritabanına otomatik uygulamaz.
