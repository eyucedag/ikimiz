import { ImageSourcePropType } from 'react-native';

/** Packaged PNG counterparts keep these assets directly compatible with Expo Go. */
export const auroraIcons = {
  today: require('../../assets/aurora/icons/bugun.png'),
  search: require('../../assets/aurora/icons/ara.png'),
  add: require('../../assets/aurora/icons/ekle.png'),
  notifications: require('../../assets/aurora/icons/bildirimler.png'),
  settings: require('../../assets/aurora/icons/ayarlar.png'),
  calendar: require('../../assets/aurora/icons/takvim.png'),
  specialDates: require('../../assets/aurora/icons/ozel_gunler.png'),
  lists: require('../../assets/aurora/icons/listeler.png'),
  notebook: require('../../assets/aurora/icons/not_defteri.png'),
  documents: require('../../assets/aurora/icons/dokumanlar.png'),
  gallery: require('../../assets/aurora/icons/galeri.png'),
  audioMemories: require('../../assets/aurora/icons/sesli_anilar.png'),
  tasks: require('../../assets/aurora/icons/gorevler.png'),
  giftRadar: require('../../assets/aurora/icons/hediye_radari.png'),
  importantFacts: require('../../assets/aurora/icons/bilinmesi_gerekenler.png'),
  places: require('../../assets/aurora/icons/gezilen_yerler.png'),
  steps: require('../../assets/aurora/icons/birlikte_adimlar.png'),
  kiss: require('../../assets/aurora/icons/opucuk.png'),
} as const;

/** Shared category-to-app-icon map keeps the home and category grids identical. */
export const auroraCategoryIcons: Record<string, ImageSourcePropType> = {
  takvim: auroraIcons.calendar,
  'ozel-gunler': auroraIcons.specialDates,
  listeler: auroraIcons.lists,
  notlar: auroraIcons.notebook,
  'onemli-belgeler': auroraIcons.documents,
  galeri: auroraIcons.gallery,
  'sesli-anilar': auroraIcons.audioMemories,
  gorevler: auroraIcons.tasks,
  'ekrana-not': auroraIcons.notebook,
  'gunun-sarkisi': auroraIcons.today,
  'hediye-radari': auroraIcons.giftRadar,
  'bilinmesi-gerekenler': auroraIcons.importantFacts,
  opucuk: auroraIcons.kiss,
  'gezilen-yerler': auroraIcons.places,
  'birlikte-adimlar': auroraIcons.steps,
  'ruh-halim': auroraIcons.today,
  yaklasanlar: auroraIcons.calendar,
};

export const auroraCategoryIllustrations: Record<string, ImageSourcePropType> = {
  takvim: require('../../assets/aurora/illustrations/takvim.png'),
  'ozel-gunler': require('../../assets/aurora/illustrations/ozel_gunler.png'),
  listeler: require('../../assets/aurora/illustrations/listeler.png'),
  notlar: require('../../assets/aurora/illustrations/not_defteri.png'),
  'onemli-belgeler': require('../../assets/aurora/illustrations/dokumanlar.png'),
  galeri: require('../../assets/aurora/illustrations/galeri.png'),
  'sesli-anilar': require('../../assets/aurora/illustrations/sesli_anilar.png'),
  gorevler: require('../../assets/aurora/illustrations/gorevler.png'),
  'hediye-radari': require('../../assets/aurora/illustrations/hediye_radari.png'),
  'bilinmesi-gerekenler': require('../../assets/aurora/illustrations/bilinmesi_gerekenler.png'),
  'gezilen-yerler': require('../../assets/aurora/illustrations/gezilen_yerler.png'),
  'birlikte-adimlar': require('../../assets/aurora/illustrations/birlikte_adimlar.png'),
};
