import { Category } from '@/src/types';

export const categories: Category[] = [
  { slug: 'ruh-halim', title: 'Ruh Halim', icon: 'smile', color: '#B96F88', tint: '#F5E6EA', description: 'Bugünkü ruh halinizi paylaşın, birbirinizin nasıl hissettiğini görün.' },
  { slug: 'takvim', title: 'Takvim & Önemli Günler', icon: 'calendar', color: '#C9573D', tint: '#F8E5DF', description: 'Ortak takvim, yıl dönümleri ve doğum günleri tek yerde.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', color: '#D78135', tint: '#FAEBDD', description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Notlar', icon: 'file-text', color: '#D0A02E', tint: '#F8F1D9', description: 'Klasörlerle düzenlenen kişisel ve ortak notlar.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', color: '#829345', tint: '#EDF0DF', description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', color: '#4E967A', tint: '#E1F0E9', description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', color: '#258C91', tint: '#DDEFF0', description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', color: '#43849D', tint: '#E1EDF1', description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'unutma', title: 'Unutma!', icon: 'bell', color: '#687DA5', tint: '#E7EAF2', description: 'Zamanı gelince hatırlatılan önemli şeyler.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);
export const getCategoryColor = (slug?: string) => getCategory(slug) ?? { color: '#B85E3F', tint: '#F6E5DF' };

const readyRoutes: Record<string, string> = {
  'ekrana-not': '/screen-note/compose',
  'ruh-halim': '/mood',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
