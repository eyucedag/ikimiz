import { Category } from '@/src/types';
import { colors } from './theme';

const categoryTones: Record<string, { color: string; tint: string }> = {
  takvim: { color: '#D8B88A', tint: '#F2E7D5' },
  'ozel-gunler': { color: '#C89A32', tint: '#C89A3224' },
  listeler: { color: '#B96845', tint: '#B9684524' },
  notlar: { color: '#8C3F32', tint: '#8C3F3224' },
  'onemli-belgeler': { color: '#AD7774', tint: '#AD777424' },
  galeri: { color: '#773D49', tint: '#773D4924' },
  'sesli-anilar': { color: '#9E704C', tint: '#9E704C24' },
  gorevler: { color: '#5B392C', tint: '#5B392C24' },
  'ekrana-not': { color: '#B1AD80', tint: '#B1AD8024' },
  'gunun-sarkisi': { color: '#777B3D', tint: '#777B3D24' },
  'hediye-radari': { color: '#365844', tint: '#36584424' },
  'bilinmesi-gerekenler': { color: '#668B87', tint: '#668B8724' },
  opucuk: { color: '#6E7591', tint: '#6E759124' },
  'gezilen-yerler': { color: '#6E7591', tint: '#6E759124' },
  'birlikte-adimlar': { color: '#34312B', tint: '#34312B24' },
  'ruh-halim': { color: '#AD7774', tint: '#F2E7D5' },
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
};
export const getCategoryColor = (slug?: string) =>
  getCategory(slug) ?? hiddenCategoryColors[slug ?? ''] ?? { color: colors.accent, tint: colors.accentLight };

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
