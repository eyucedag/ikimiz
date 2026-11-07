export type Visibility = 'personal' | 'shared';

export interface User {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  createdAt: string;
}

export interface Couple {
  id: string;
  memberIds: string[];
  createdAt: string;
  endedAt?: string | null;
  photoPath?: string | null;
  photoUrl?: string | null;
  relationshipStartedAt?: string | null;
}

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Invitation {
  id: string;
  code: string;
  inviterId: string;
  inviterName: string;
  inviteeId?: string | null;
  status: InvitationStatus;
  createdAt: string;
}

export interface CoupleState {
  couple: Couple | null;
  partner: User | null;
  pendingInvitation: Invitation | null;
}

export interface ScreenNote {
  id: string;
  coupleId: string | null;
  senderId: string;
  receiverId: string | null;
  text: string;
  emoji: string;
  backgroundColor: string;
  imageUrl?: string | null;
  createdAt: string;
  readAt?: string | null;
}

export type NotificationCategory = 'system' | 'invitation' | 'couple' | 'screen_note' | 'event' | 'task' | 'reminder';

export interface AppNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface UpcomingItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  kind?: 'event' | 'special';
}

export interface Category {
  slug: string;
  title: string;
  icon: string;
  description: string;
  color: string;
  tint: string;
}

export interface SearchResult {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  route?: string;
}

export interface ServiceResult<T = void> {
  data?: T;
  error?: string;
}
