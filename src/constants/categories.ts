import { Category } from '@/src/types';
import { colors } from './theme';

export const categories: Category[] = [
  { slug: 'takvim', title: 'Takvim', icon: 'calendar', color: colors.accent, tint: colors.accentLight, description: 'Ortak planlarınızı ve etkinliklerinizi takvimde görün.' },
  { slug: 'ozel-gunler', title: 'Özel Günler', icon: 'gift', color: colors.accent, tint: colors.accentLight, description: 'Yıl dönümü, doğum günü ve sizin için anlamlı tarihleri ekleyin.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', color: colors.accent, tint: colors.accentLight, description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Not Defteri', icon: 'file-text', color: colors.accent, tint: colors.accentLight, description: 'Resmi ve önemli bilgileri partnerinizle ortak kaydedin.' },
  { slug: 'onemli-belgeler', title: 'Dokümanlar', icon: 'folder', color: colors.accent, tint: colors.accentLight, description: 'Dosyaları ve önemli bağlantıları güvenle ortak saklayın.' },
  { slug: 'galeri', title: 'Galeri', icon: 'image', color: colors.accent, tint: colors.accentLight, description: 'En sevdiğiniz fotoğrafları birlikte biriktirin.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', color: colors.accent, tint: colors.accentLight, description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', color: colors.accent, tint: colors.accentLight, description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'gunun-sarkisi', title: 'Günün Şarkısı', icon: 'music', color: colors.accent, tint: colors.accentLight, description: 'Her gün birbiriniz için bir şarkı seçin ve birlikte dinleyin.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', color: colors.accent, tint: colors.accentLight, description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', color: colors.accent, tint: colors.accentLight, description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'opucuk', title: 'Öpücük', icon: 'heart', color: colors.accent, tint: colors.accentLight, description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.' },
  { slug: 'gezilen-yerler', title: 'Gezdiğimiz Yerler', icon: 'map-pin', color: colors.accent, tint: colors.accentLight, description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.' },
  { slug: 'birlikte-adimlar', title: 'Birlikte Atılan Adımlar', icon: 'activity', color: colors.accent, tint: colors.accentLight, description: 'Telefonunuzun adım sayarından günlük adımlarınızı paylaşın.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
const hiddenCategoryColors: Record<string, { color: string; tint: string }> = {
  'ruh-halim': { color: colors.accent, tint: colors.accentLight },
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
  gorevler: '/tasks',
  'hediye-radari': '/gifts',
  'bilinmesi-gerekenler': '/facts',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
