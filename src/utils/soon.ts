import { Alert } from 'react-native';

/** Henüz geliştirilmemiş özellikler için dürüst "Yakında" bilgilendirmesi. */
export const showSoon = (feature: string, detail?: string) =>
  Alert.alert(`${feature} · Yakında`, detail ?? `${feature} özelliği bir sonraki aşamada eklenecek.`);

export const showSocialSoon = (provider: 'Google' | 'Apple') =>
  showSoon(`${provider} ile giriş`, `${provider} ile giriş yakında eklenecek. Şimdilik e-posta ile devam edebilirsiniz.`);
