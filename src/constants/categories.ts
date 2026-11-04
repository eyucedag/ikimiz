import { Category } from '@/src/types';

export const categories: Category[] = [
  { slug: 'ruh-halim', title: 'Ruh Halim', icon: 'smile', description: 'Bugünkü ruh halinizi paylaşın, birbirinizin nasıl hissettiğini görün.' },
  { slug: 'takvim', title: 'Takvim & Önemli Günler', icon: 'calendar', description: 'Ortak takvim, yıl dönümleri ve doğum günleri tek yerde.' },
  { slug: 'listeler', title: 'Listeler', icon: 'list', description: 'Market, film, seyahat gibi ortak listeleri birlikte yönetin.' },
  { slug: 'notlar', title: 'Notlar', icon: 'file-text', description: 'Klasörlerle düzenlenen kişisel ve ortak notlar.' },
  { slug: 'gorevler', title: 'Görevler', icon: 'check-square', description: 'Ev işleri ve planları paylaşın, tekrarlayan görevler oluşturun.' },
  { slug: 'ekrana-not', title: 'Ekrana Not', icon: 'edit-3', description: 'Partnerinizin ana ekranına kısa bir not bırakın.' },
  { slug: 'hediye-radari', title: 'Hediye Radarı', icon: 'gift', description: 'Hediye fikirlerini partnerinizden gizli biriktirin.' },
  { slug: 'bilinmesi-gerekenler', title: 'Bilinmesi Gerekenler', icon: 'heart', description: 'Beden ölçüleri, alerjiler, sevdiği şeyler gibi önemli bilgiler.' },
  { slug: 'unutma', title: 'Unutma!', icon: 'bell', description: 'Zamanı gelince hatırlatılan önemli şeyler.' },
];

export const getCategory = (slug?: string) => categories.find((c) => c.slug === slug);

const readyRoutes: Record<string, string> = {
  'ekrana-not': '/screen-note/compose',
  'ruh-halim': '/mood',
};

export const getCategoryRoute = (slug: string) => readyRoutes[slug] ?? `/categories/${slug}`;
export const isCategoryReady = (slug: string) => Object.prototype.hasOwnProperty.call(readyRoutes, slug);
