export const coupleQuestions = [
  { id: 'understood', question: 'Kendini en çok ne zaman anlaşılmış hissedersin?' },
  { id: 'small-joy', question: 'Gün içinde yüzünü güldüren küçük şey nedir?' },
  { id: 'support', question: 'Zor bir günün sonunda sana nasıl destek olmamı istersin?' },
  { id: 'favorite-memory', question: 'Birlikte yaşadığımız en sevdiğin küçük an hangisi?' },
  { id: 'ideal-day', question: 'Birlikte geçireceğimiz kusursuz bir gün nasıl olurdu?' },
  { id: 'new-experience', question: 'Birlikte ilk kez denemek istediğin şey ne?' },
  { id: 'appreciated', question: 'Bende en çok takdir ettiğin özellik hangisi?' },
  { id: 'comfort', question: 'Kendini evinde ve huzurlu hissettiren şey nedir?' },
  { id: 'tradition', question: 'Birlikte başlatmak istediğin küçük bir gelenek var mı?' },
  { id: 'dream-trip', question: 'Birlikte gitmeyi hayal ettiğin yer neresi?' },
  { id: 'love-language', question: 'Sevildiğini en çok hangi davranışımla hissediyorsun?' },
  { id: 'learn', question: 'Bu yıl öğrenmek veya geliştirmek istediğin bir şey ne?' },
  { id: 'relax', question: 'Birlikte en iyi nasıl dinleniyoruz?' },
  { id: 'childhood', question: 'Çocukluğundan bugün hâlâ gülümseten bir anın var mı?' },
  { id: 'surprise', question: 'Seni mutlu eden küçük bir sürpriz ne olabilir?' },
  { id: 'team', question: 'Sence birlikte en iyi başardığımız şey ne?' },
  { id: 'future-home', question: 'İleride nasıl bir yaşam alanında yaşamak isterdin?' },
  { id: 'more-of', question: 'Birlikte daha sık yapmamızı istediğin şey nedir?' },
] as const;

export type CoupleQuestionId = (typeof coupleQuestions)[number]['id'];
