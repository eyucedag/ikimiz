# SQL kurulumu ve güncellemeler

[Supabase SQL Editor](https://supabase.com/dashboard/project/phrfepvdjebxfmfkhiju/sql/new)
üzerinden **New query → Run** kullanılır. Uygulamanın önizleme yayını SQL dosyalarını
canlı veritabanına kendiliğinden uygulamaz.

## Mevcut kurulum için son düzeltmeler

1. Daha önce çalıştırılmadıysa `migrations/20261107_expand_mood_options.sql`: Yorgunum,
   Enerjik, Kızgın ve Sıkılmış değerlerini kabul eder.
2. `migrations/20261108_flower_health_consistency.sql`: Uzun süre kuruyan bitkinin
   sulanınca toparlanmasını ve tür değiştirilince sağlığının korunmasını düzeltir.
   Öncesinde ortak çiçek ve bitki türü kurulumlarının bulunması gerekir.

Bu iki dosya mevcut kayıtları silmez ve tekrar çalıştırılabilir.

## Yeni kurulum / geçmiş dosyalar

`schema.sql` temel kullanıcı, eşleşme ve ortak kategori tablolarını kurar. Özellik
migration'ları gereken modülleri ve sonraki izin/şema düzeltmelerini ekler.
Tarihleri aynı olan geçmiş dosyaları alfabetik sırayla çalıştırmak doğru değildir:

- `20261107_shared_couple_flower.sql` → `20261107_couple_flower_plant_types.sql`
  → `20261107_species_based_couple_flower_health.sql` → `20261108_flower_health_consistency.sql`.
- `20261105_shared_song_of_the_day.sql` → `20261107_shared_daily_song_per_partner.sql`.
- `20261104_mood_entries.sql` → `20261107_expand_mood_options.sql`.
- Galeri, belge ve ses deposu kurulumları, bu modüllerin daha sonraki düzenleme
  migration'larından önce uygulanır.

Bu depodaki eski dosyalar SQL Editor için hazırlanmıştır; aynı tarih önekini paylaşan
dosyalar standart Supabase CLI migration sürümleri olarak kullanılamaz. Geçmiş
dosyaları topluca yeniden çalıştırmayın. Özellikle `20261105_remove_couple_question_answers.sql`
kaldırılmış bir özelliğin tarihsel silme işlemidir ve kurulum sırasına dahil değildir.

`npm run test:database`, çiçek RPC'lerini ve ruh hali kısıtını geçici PostgreSQL üzerinde
test eder. Yetkisiz erişim, sınır değerleri, eşzamanlı sulama ve tekrar uygulanabilirlik
kontrollerini içerir. Canlı veritabanının migration durumunu ölçmez.
