import { Category } from '@/src/types';

export const categories: Category[] = [
  { slug: 'takvim', title: 'Takvim', icon: 'calendar', color: '#F0443A', tint: '#FFE3DF', description: 'Ortak planlarınızı ve etkinliklerinizi takvimde görün.' },
  { slug: 'ozel-gunler', title: 'Özel Günler', icon: 'gift', color: '#C03CA8', tint: '#FBE3F5', description: 'Yıl dönümü, doğum günü ve sizin için anlamlı tarihleri ekleyin.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', color: '#F27A00', tint: '#FFEAD8', description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Notlar', icon: 'file-text', color: '#A98B00', tint: '#F8F1C9', description: 'Klasörlerle düzenlenen kişisel ve ortak notlar.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', color: '#72B900', tint: '#EAF7D4', description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', color: '#00A85A', tint: '#D9F5E6', description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', color: '#009EA5', tint: '#D8F3F3', description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', color: '#1676E8', tint: '#DFEBFF', description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'opucuk', title: 'Öpücük', icon: 'heart', color: '#E5163D', tint: '#FFF0F3', description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.' },
  { slug: 'gezilen-yerler', title: 'Gezdiğimiz Yerler', icon: 'map-pin', color: '#0B8F87', tint: '#D8F4EF', description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.' },
  { slug: 'birlikte-adimlar', title: 'Birlikte Atılan Adımlar', icon: 'activity', color: '#1676E8', tint: '#DFEBFF', description: 'Telefonunuzun adım sayarından günlük adımlarınızı paylaşın.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
export const getCategoryColor = (slug?: string) => getCategory(slug) ?? { color: '#536F8D', tint: '#E7EDF3' };

const readyRoutes: Record<string, string> = {
  'ekrana-not': '/screen-note/compose',
  'ruh-halim': '/mood',
  'gezilen-yerler': '/travel-map',
  'ozel-gunler': '/special-dates',
  'birlikte-adimlar': '/categories/steps',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
