import { Category } from '@/src/types';

/** Kategori renkleri zip içindeki uygulama referansından aktarılmıştır. */
const categoryTones: Record<string, { color: string; tint: string; ink: string }> = {
  takvim: { color: '#3D6796', tint: '#3D679626', ink: '#FFFFFF' },
  'ozel-gunler': { color: '#93485F', tint: '#93485F26', ink: '#FFFFFF' },
  listeler: { color: '#346C59', tint: '#346C5926', ink: '#FFFFFF' },
  notlar: { color: '#BCBA67', tint: '#BCBA6726', ink: '#17243B' },
  'onemli-belgeler': { color: '#66758C', tint: '#66758C26', ink: '#FFFFFF' },
  galeri: { color: '#62458A', tint: '#62458A26', ink: '#FFFFFF' },
  'sesli-anilar': { color: '#A66F59', tint: '#A66F5926', ink: '#FFFFFF' },
  gorevler: { color: '#2C6E72', tint: '#2C6E7226', ink: '#FFFFFF' },
  'ekrana-not': { color: '#C9A1BF', tint: '#C9A1BF26', ink: '#17243B' },
  'gunun-sarkisi': { color: '#2C3A65', tint: '#2C3A6526', ink: '#FFFFFF' },
  'hediye-radari': { color: '#68584D', tint: '#68584D26', ink: '#FFFFFF' },
  'bilinmesi-gerekenler': { color: '#706D69', tint: '#706D6926', ink: '#FFFFFF' },
  opucuk: { color: '#93485F', tint: '#93485F26', ink: '#FFFFFF' },
  'gezilen-yerler': { color: '#8BB8C9', tint: '#8BB8C926', ink: '#17243B' },
  'birlikte-adimlar': { color: '#80935B', tint: '#80935B26', ink: '#17243B' },
  'ruh-halim': { color: '#AEADD0', tint: '#AEADD026', ink: '#17243B' },
};

export const categories: Category[] = [
  {
    slug: 'takvim',
    title: 'Takvim',
    icon: 'calendar',
    ...categoryTones.takvim,
    description: 'Ortak planlarınızı ve etkinliklerinizi takvimde görün.',
  },
  {
    slug: 'ozel-gunler',
    title: 'Özel Günler',
    icon: 'gift',
    ...categoryTones['ozel-gunler'],
    description: 'Yıl dönümü, doğum günü ve sizin için anlamlı tarihleri ekleyin.',
  },
  {
    slug: 'listeler',
    title: 'Listeler',
    icon: 'list',
    ...categoryTones.listeler,
    description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.',
  },
  {
    slug: 'notlar',
    title: 'Not Defteri',
    icon: 'file-text',
    ...categoryTones.notlar,
    description: 'Önemli notlarınızı partnerinizle ortak kaydedin.',
  },
  {
    slug: 'onemli-belgeler',
    title: 'Dokümanlar',
    icon: 'folder',
    ...categoryTones['onemli-belgeler'],
    description: 'Dosyaları ve önemli bağlantıları ortak alanda saklayın.',
  },
  {
    slug: 'galeri',
    title: 'Galeri',
    icon: 'image',
    ...categoryTones.galeri,
    description: 'En sevdiğiniz fotoğrafları birlikte biriktirin.',
  },
  {
    slug: 'sesli-anilar',
    title: 'Sesli Anılar',
    icon: 'mic',
    ...categoryTones['sesli-anilar'],
    description: 'Sesinizi ve güzel anlarınızı ortak bir arşivde saklayın.',
  },
  {
    slug: 'gorevler',
    title: 'Görevler',
    icon: 'check-square',
    ...categoryTones.gorevler,
    description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.',
  },
  {
    slug: 'ekrana-not',
    title: 'Partnerinden Not',
    icon: 'edit-3',
    ...categoryTones['ekrana-not'],
    description: 'Partnerinizin ana ekranına kısa bir not bırakın.',
  },
  {
    slug: 'gunun-sarkisi',
    title: 'Günün Şarkısı',
    icon: 'music',
    ...categoryTones['gunun-sarkisi'],
    description: 'Her gün birbiriniz için bir şarkı seçin ve birlikte dinleyin.',
  },
  {
    slug: 'hediye-radari',
    title: 'Hediye Radarı',
    icon: 'gift',
    ...categoryTones['hediye-radari'],
    description: 'Hediye fikirlerini ortak alanda biriktirin.',
  },
  {
    slug: 'bilinmesi-gerekenler',
    title: 'Bilinmesi Gerekenler',
    icon: 'info',
    ...categoryTones['bilinmesi-gerekenler'],
    description: 'Birbiriniz için önemli bilgileri kaydedin.',
  },
  {
    slug: 'opucuk',
    title: 'Öpücük',
    icon: 'heart',
    ...categoryTones.opucuk,
    description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.',
  },
  {
    slug: 'gezilen-yerler',
    title: 'Gezdiğimiz Yerler',
    icon: 'map-pin',
    ...categoryTones['gezilen-yerler'],
    description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.',
  },
  {
    slug: 'birlikte-adimlar',
    title: 'Birlikte Atılan Adımlar',
    icon: 'activity',
    ...categoryTones['birlikte-adimlar'],
    description: 'Telefonunuzun adım sayarından günlük adımlarınızı paylaşın.',
  },
];

export const getCategory = (slug?: string) => categories.find((category) => category.slug === slug);

const hiddenCategoryColors: Record<string, { color: string; tint: string; ink: string }> = {
  'ruh-halim': categoryTones['ruh-halim'],
  yaklasanlar: {
    color: '#414A56',
    tint: '#414A5626',
    ink: '#FFFFFF',
  },
  'birbirimizi-taniyalim': categoryTones['bilinmesi-gerekenler'],
};

export const getCategoryColor = (slug?: string) => {
  const category = getCategory(slug);
  if (category) return { color: category.color, tint: category.tint, ink: category.ink ?? '#FFFFFF' };
  return hiddenCategoryColors[slug ?? ''] ?? hiddenCategoryColors['birbirimizi-taniyalim'];
};

const readyRoutes: Record<string, string> = {
  'ekrana-not': '/screen-note/compose',
  'ruh-halim': '/mood',
  'gezilen-yerler': '/travel-map',
  'ozel-gunler': '/special-dates',
  'birlikte-adimlar': '/categories/steps',
  takvim: '/calendar',
  'gunun-sarkisi': '/song-of-the-day',
  listeler: '/lists',
  notlar: '/notebook',
  'onemli-belgeler': '/documents',
  galeri: '/gallery',
  'sesli-anilar': '/audio-memories',
  gorevler: '/tasks',
  'hediye-radari': '/gifts',
  'bilinmesi-gerekenler': '/facts',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
