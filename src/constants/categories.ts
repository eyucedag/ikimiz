import { Category } from '@/src/types';
const categoryTones: Record<string, { color: string; tint: string }> = {
  takvim: { color: '#34302E', tint: '#34302E55' },
  'ozel-gunler': { color: '#4B413A', tint: '#4B413A55' },
  listeler: { color: '#3F2A22', tint: '#3F2A2255' },
  notlar: { color: '#5A3B2B', tint: '#5A3B2B55' },
  'onemli-belgeler': { color: '#8B4A2F', tint: '#8B4A2F55' },
  galeri: { color: '#7A332A', tint: '#7A332A55' },
  'sesli-anilar': { color: '#6A2F27', tint: '#6A2F2755' },
  gorevler: { color: '#8C5A32', tint: '#8C5A3255' },
  'ekrana-not': { color: '#5B602C', tint: '#5B602C55' },
  'gunun-sarkisi': { color: '#425337', tint: '#42533755' },
  'hediye-radari': { color: '#3E4A32', tint: '#3E4A3255' },
  'bilinmesi-gerekenler': { color: '#2F4E50', tint: '#2F4E5055' },
  opucuk: { color: '#7A332A', tint: '#7A332A55' },
  'gezilen-yerler': { color: '#45515A', tint: '#45515A55' },
  'birlikte-adimlar': { color: '#583847', tint: '#58384755' },
  'ruh-halim': { color: '#4A2E3A', tint: '#4A2E3A55' },
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
