import { Category } from '@/src/types';
import { colors } from './theme';

export const categories: Category[] = [
  { slug: 'takvim', title: 'Takvim', icon: 'calendar', color: '#276BFF', tint: '#E8EFFF', description: 'Ortak planlarınızı ve etkinliklerinizi takvimde görün.' },
  { slug: 'ozel-gunler', title: 'Özel Günler', icon: 'gift', color: '#C900A9', tint: '#FBE5F7', description: 'Yıl dönümü, doğum günü ve sizin için anlamlı tarihleri ekleyin.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', color: '#D85C00', tint: '#FFF0E5', description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Not Defteri', icon: 'file-text', color: '#A77B00', tint: '#FFF5D9', description: 'Resmi ve önemli bilgileri partnerinizle ortak kaydedin.' },
  { slug: 'onemli-belgeler', title: 'Dokümanlar', icon: 'folder', color: '#3175D5', tint: '#E8F0FE', description: 'Dosyaları ve önemli bağlantıları güvenle ortak saklayın.' },
  { slug: 'galeri', title: 'Galeri', icon: 'image', color: '#C93670', tint: '#FBE6EF', description: 'En sevdiğiniz fotoğrafları birlikte biriktirin.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', color: '#638C00', tint: '#EEF7D9', description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', color: '#00834D', tint: '#E1F4E9', description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'gunun-sarkisi', title: 'Günün Şarkısı', icon: 'music', color: '#8042D5', tint: '#F0E9FC', description: 'Her gün birbiriniz için bir şarkı seçin ve birlikte dinleyin.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', color: '#00858A', tint: '#E1F5F4', description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', color: '#D12F54', tint: '#FCE6EB', description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'birbirimizi-taniyalim', title: 'Birbirimizi Tanıyalım', icon: 'message-circle', color: '#9C27D8', tint: '#F4E7FC', description: 'Soruları sırayla yanıtlayın, cevaplarınızı birlikte keşfedin.' },
  { slug: 'opucuk', title: 'Öpücük', icon: 'heart', color: '#E21E3F', tint: '#FFE6EB', description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.' },
  { slug: 'gezilen-yerler', title: 'Gezdiğimiz Yerler', icon: 'map-pin', color: '#009B85', tint: '#E2F6F1', description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.' },
  { slug: 'birlikte-adimlar', title: 'Birlikte Atılan Adımlar', icon: 'activity', color: '#4E55D9', tint: '#EBECFF', description: 'Telefonunuzun adım sayarından günlük adımlarınızı paylaşın.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
const hiddenCategoryColors: Record<string, { color: string; tint: string }> = {
  'ruh-halim': { color: '#C22A84', tint: '#FBE5F1' },
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
  'birbirimizi-taniyalim': '/get-to-know',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
