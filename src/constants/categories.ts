import { Category } from '@/src/types';
import { colors } from './theme';

export const categories: Category[] = [
  { slug: 'takvim', title: 'Takvim', icon: 'calendar', color: '#E99A69', tint: '#315A4A', description: 'Ortak planlarınızı ve etkinliklerinizi takvimde görün.' },
  { slug: 'ozel-gunler', title: 'Özel Günler', icon: 'gift', color: '#E99A69', tint: '#315A4A', description: 'Yıl dönümü, doğum günü ve sizin için anlamlı tarihleri ekleyin.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', color: '#E99A69', tint: '#315A4A', description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Not Defteri', icon: 'file-text', color: '#E99A69', tint: '#315A4A', description: 'Resmi ve önemli bilgileri partnerinizle ortak kaydedin.' },
  { slug: 'onemli-belgeler', title: 'Dokümanlar', icon: 'folder', color: '#E99A69', tint: '#315A4A', description: 'Dosyaları ve önemli bağlantıları güvenle ortak saklayın.' },
  { slug: 'galeri', title: 'Galeri', icon: 'image', color: '#E99A69', tint: '#315A4A', description: 'En sevdiğiniz fotoğrafları birlikte biriktirin.' },
  { slug: 'sesli-anilar', title: 'Sesli Anılar', icon: 'mic', color: '#E99A69', tint: '#315A4A', description: 'Sesinizi ve güzel anlarınızı ortak bir arşivde saklayın.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', color: '#E99A69', tint: '#315A4A', description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', color: '#E99A69', tint: '#315A4A', description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'gunun-sarkisi', title: 'Günün Şarkısı', icon: 'music', color: '#E99A69', tint: '#315A4A', description: 'Her gün birbiriniz için bir şarkı seçin ve birlikte dinleyin.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', color: '#E99A69', tint: '#315A4A', description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', color: '#E99A69', tint: '#315A4A', description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'opucuk', title: 'Öpücük', icon: 'heart', color: '#E99A69', tint: '#315A4A', description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.' },
  { slug: 'gezilen-yerler', title: 'Gezdiğimiz Yerler', icon: 'map-pin', color: '#E99A69', tint: '#315A4A', description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.' },
  { slug: 'birlikte-adimlar', title: 'Birlikte Atılan Adımlar', icon: 'activity', color: '#E99A69', tint: '#315A4A', description: 'Telefonunuzun adım sayarından günlük adımlarınızı paylaşın.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
const hiddenCategoryColors: Record<string, { color: string; tint: string }> = {
  'ruh-halim': { color: '#E99A69', tint: '#315A4A' },
};
export const getCategoryColor = (slug?: string) => getCategory(slug) ?? hiddenCategoryColors[slug ?? ''] ?? { color: colors.accent, tint: colors.accentLight };

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
