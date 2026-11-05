import { Category } from '@/src/types';

export const categories: Category[] = [
  { slug: 'takvim', title: 'Takvim', icon: 'calendar', color: '#3F78D4', tint: '#E5EEFF', description: 'Ortak planlarınızı ve etkinliklerinizi takvimde görün.' },
  { slug: 'ozel-gunler', title: 'Özel Günler', icon: 'gift', color: '#C03CA8', tint: '#FBE3F5', description: 'Yıl dönümü, doğum günü ve sizin için anlamlı tarihleri ekleyin.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', color: '#D98219', tint: '#FFF0DE', description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Not Defteri', icon: 'file-text', color: '#AD8511', tint: '#FBF3D4', description: 'Resmi ve önemli bilgileri partnerinizle ortak kaydedin.' },
  { slug: 'onemli-belgeler', title: 'Dokümanlar', icon: 'folder', color: '#52769D', tint: '#E7EFF7', description: 'Dosyaları ve önemli bağlantıları güvenle ortak saklayın.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', color: '#64A82F', tint: '#EAF5DF', description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', color: '#168D57', tint: '#DFF3E8', description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'gunun-sarkisi', title: 'Günün Şarkısı', icon: 'music', color: '#8155B5', tint: '#F0EAF8', description: 'Her gün birbiriniz için bir şarkı seçin ve birlikte dinleyin.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', color: '#009E98', tint: '#DDF5F2', description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', color: '#3979CB', tint: '#E4EEFC', description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'opucuk', title: 'Öpücük', icon: 'heart', color: '#E5163D', tint: '#FFF0F3', description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.' },
  { slug: 'gezilen-yerler', title: 'Gezdiğimiz Yerler', icon: 'map-pin', color: '#0B8F87', tint: '#D8F4EF', description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.' },
  { slug: 'birlikte-adimlar', title: 'Birlikte Atılan Adımlar', icon: 'activity', color: '#4279DA', tint: '#E5EEFF', description: 'Telefonunuzun adım sayarından günlük adımlarınızı paylaşın.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
const hiddenCategoryColors: Record<string, { color: string; tint: string }> = {
  'ruh-halim': { color: '#E83D96', tint: '#FCE4F2' },
};
export const getCategoryColor = (slug?: string) => getCategory(slug) ?? hiddenCategoryColors[slug ?? ''] ?? { color: '#536F8D', tint: '#E7EDF3' };

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
  gorevler: '/tasks',
  'hediye-radari': '/gifts',
  'bilinmesi-gerekenler': '/facts',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
