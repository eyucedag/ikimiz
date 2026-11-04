import { Category } from '@/src/types';

export const categories: Category[] = [
  { slug: 'ruh-halim', title: 'Ruh Halim', icon: 'smile', color: '#F02F9B', tint: '#FFE1F1', description: 'Bugünkü ruh halinizi paylaşın, birbirinizin nasıl hissettiğini görün.' },
  { slug: 'takvim', title: 'Takvim & Önemli Günler', icon: 'calendar', color: '#F0443A', tint: '#FFE3DF', description: 'Ortak takvim, yıl dönümleri ve doğum günleri tek yerde.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', color: '#F27A00', tint: '#FFEAD8', description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Notlar', icon: 'file-text', color: '#A98B00', tint: '#F8F1C9', description: 'Klasörlerle düzenlenen kişisel ve ortak notlar.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', color: '#72B900', tint: '#EAF7D4', description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', color: '#00A85A', tint: '#D9F5E6', description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', color: '#009EA5', tint: '#D8F3F3', description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', color: '#1676E8', tint: '#DFEBFF', description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'unutma', title: 'Unutma!', icon: 'bell', color: '#7948EA', tint: '#ECE4FF', description: 'Zamanı gelince hatırlatılan önemli şeyler.' },
  { slug: 'opucuk', title: 'Öpücük', icon: 'heart', color: '#E5163D', tint: '#FFF0F3', description: 'İstediğiniz zaman partnerinize animasyonlu öpücük gönderin.' },
  { slug: 'gezilen-yerler', title: 'Gezdiğimiz Yerler', icon: 'map-pin', color: '#0B8F87', tint: '#D8F4EF', description: 'Birlikte gittiğiniz şehirleri ve ülkeleri haritada biriktirin.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
export const getCategoryColor = (slug?: string) => getCategory(slug) ?? { color: '#536F8D', tint: '#E7EDF3' };

const readyRoutes: Record<string, string> = {
  'ekrana-not': '/screen-note/compose',
  'ruh-halim': '/mood',
  'gezilen-yerler': '/travel-map',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
