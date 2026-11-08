import { Category } from '@/src/types';
import { colors } from './theme';

export const categories: Category[] = [
  {
    slug: 'takvim',
    title: 'Takvim',
    icon: 'calendar',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Ortak planlarınızı ve etkinliklerinizi takvimde görün.',
  },
  {
    slug: 'ozel-gunler',
    title: 'Özel Günler',
    icon: 'gift',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Yıl dönümü, doğum günü ve sizin için anlamlı tarihleri ekleyin.',
  },
  {
    slug: 'listeler',
    title: 'Listeler',
    icon: 'list',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.',
  },
  {
    slug: 'notlar',
    title: 'Not Defteri',
    icon: 'file-text',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Resmi ve önemli bilgileri partnerinizle ortak kaydedin.',
  },
  {
    slug: 'onemli-belgeler',
    title: 'Dokümanlar',
    icon: 'folder',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Dosyaları ve önemli bağlantıları güvenle ortak saklayın.',
  },
  {
    slug: 'galeri',
    title: 'Galeri',
    icon: 'image',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'En sevdiğiniz fotoğrafları birlikte biriktirin.',
  },
  {
    slug: 'sesli-anilar',
    title: 'Sesli Anılar',
    icon: 'mic',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Sesinizi ve güzel anlarınızı ortak bir arşivde saklayın.',
  },
  {
    slug: 'gorevler',
    title: 'Görevler',
    icon: 'check-square',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.',
  },
  {
    slug: 'ekrana-not',
    title: 'Ekrana Not',
    icon: 'edit-3',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Partnerinizin ana ekranına kısa bir not bırakın.',
  },
  {
    slug: 'gunun-sarkisi',
    title: 'Günün Şarkısı',
    icon: 'music',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Her gün birbiriniz için bir şarkı seçin ve birlikte dinleyin.',
  },
  {
    slug: 'hediye-radari',
    title: 'Hediye Radarı',
    icon: 'gift',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Hediye fikirlerini partnerinizden gizli biriktirin.',
  },
  {
    slug: 'bilinmesi-gerekenler',
    title: 'Bilinmesi Gerekenler',
    icon: 'heart',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.',
  },
  {
    slug: 'opucuk',
    title: 'Öpücük',
    icon: 'heart',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.',
  },
  {
    slug: 'gezilen-yerler',
    title: 'Gezdiğimiz Yerler',
    icon: 'map-pin',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.',
  },
  {
    slug: 'birlikte-adimlar',
    title: 'Birlikte Atılan Adımlar',
    icon: 'activity',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Telefonunuzun adım sayarından günlük adımlarınızı paylaşın.',
  },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
const hiddenCategoryColors: Record<string, { color: string; tint: string }> = {
  'ruh-halim': { color: '#AD633F', tint: '#F2E7DB' },
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
