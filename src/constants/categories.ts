import { Category } from '@/src/types';
const categoryTones: Record<string, { color: string; tint: string }> = {
  takvim: { color: '#2F718C', tint: '#2F718C35' },
  'ozel-gunler': { color: '#DA7055', tint: '#DA705535' },
  listeler: { color: '#75864D', tint: '#75864D35' },
  notlar: { color: '#A78350', tint: '#A7835035' },
  'onemli-belgeler': { color: '#368589', tint: '#36858935' },
  galeri: { color: '#5C9AB4', tint: '#5C9AB435' },
  'sesli-anilar': { color: '#886C9C', tint: '#886C9C35' },
  gorevler: { color: '#89934E', tint: '#89934E35' },
  'ekrana-not': { color: '#B45258', tint: '#B4525835' },
  'gunun-sarkisi': { color: '#B9793F', tint: '#B9793F35' },
  'hediye-radari': { color: '#527A96', tint: '#527A9635' },
  'bilinmesi-gerekenler': { color: '#657D75', tint: '#657D7535' },
  opucuk: { color: '#B45258', tint: '#B4525835' },
  'gezilen-yerler': { color: '#4F8262', tint: '#4F826235' },
  'birlikte-adimlar': { color: '#CD765F', tint: '#CD765F35' },
  'ruh-halim': { color: '#805A78', tint: '#805A7835' },
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
    description: 'Resmi ve önemli bilgileri partnerinizle ortak kaydedin.',
  },
  {
    slug: 'onemli-belgeler',
    title: 'Dokümanlar',
    icon: 'folder',
    ...categoryTones['onemli-belgeler'],
    description: 'Dosyaları ve önemli bağlantıları güvenle ortak saklayın.',
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
    title: 'Ekrana Not',
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
    description: 'Hediye fikirlerini partnerinizden gizli biriktirin.',
  },
  {
    slug: 'bilinmesi-gerekenler',
    title: 'Bilinmesi Gerekenler',
    icon: 'heart',
    ...categoryTones['bilinmesi-gerekenler'],
    description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.',
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

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
const hiddenCategoryColors: Record<string, { color: string; tint: string }> = {
  'ruh-halim': categoryTones['ruh-halim'],
  yaklasanlar: categoryTones['ozel-gunler'],
  'birbirimizi-taniyalim': categoryTones['bilinmesi-gerekenler'],
};
export const getCategoryColor = (slug?: string) =>
  getCategory(slug) ?? hiddenCategoryColors[slug ?? ''] ?? categoryTones['bilinmesi-gerekenler'];

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
