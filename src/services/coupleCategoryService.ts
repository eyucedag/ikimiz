import { supabase } from '@/src/lib/supabase';
import { normalizeHttpUrl } from '@/src/utils/url';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  completed_at: string | null;
  owner_id: string;
};
export type GiftIdea = {
  id: string;
  title: string;
  url: string | null;
  price: number | null;
  is_purchased: boolean;
};
export type PartnerFact = { id: string; label: string; value: string | null; category: string };

const fail = (error: { message: string } | null, label: string): void => {
  if (error) throw new Error(`${label}: ${error.message}`);
};

export const taskService = {
  async list(coupleId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id,title,description,due_at,completed_at,owner_id')
      .eq('couple_id', coupleId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    fail(error, 'Görevler yüklenemedi');
    return (data ?? []) as Task[];
  },
  async add(ownerId: string, coupleId: string, title: string) {
    const { error } = await supabase
      .from('tasks')
      .insert({ owner_id: ownerId, couple_id: coupleId, title: title.trim(), visibility: 'shared' });
    fail(error, 'Görev eklenemedi');
  },
  async toggle(id: string, completed: boolean) {
    const { error } = await supabase
      .from('tasks')
      .update({ completed_at: completed ? null : new Date().toISOString() })
      .eq('id', id);
    fail(error, 'Görev güncellenemedi');
  },
  async remove(id: string) {
    const { error } = await supabase.from('tasks').update({ is_deleted: true }).eq('id', id);
    fail(error, 'Görev kaldırılamadı');
  },
};

export const giftService = {
  async list(coupleId: string) {
    const { data, error } = await supabase
      .from('gift_ideas')
      .select('id,title,url,price,is_purchased')
      .eq('couple_id', coupleId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    fail(error, 'Hediye fikirleri yüklenemedi');
    return (data ?? []) as GiftIdea[];
  },
  async add(ownerId: string, coupleId: string, title: string, url: string, price: string) {
    if (!title.trim()) throw new Error('Hediye adını yazın.');
    const amount = price.trim() ? Number(price.replace(',', '.')) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0))
      throw new Error('Geçerli bir fiyat girin.');
    const { error } = await supabase.from('gift_ideas').insert({
      owner_id: ownerId,
      couple_id: coupleId,
      title: title.trim(),
      url: url.trim() ? normalizeHttpUrl(url) : null,
      price: amount,
      visibility: 'personal',
    });
    fail(error, 'Hediye fikri eklenemedi');
  },
  async toggle(id: string, is_purchased: boolean) {
    const { error } = await supabase.from('gift_ideas').update({ is_purchased }).eq('id', id);
    fail(error, 'Hediye güncellenemedi');
  },
  async remove(id: string) {
    const { error } = await supabase.from('gift_ideas').update({ is_deleted: true }).eq('id', id);
    fail(error, 'Hediye kaldırılamadı');
  },
};

export const factService = {
  async list(coupleId: string) {
    const { data, error } = await supabase
      .from('partner_facts')
      .select('id,label,value,category')
      .eq('couple_id', coupleId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    fail(error, 'Bilgiler yüklenemedi');
    return (data ?? []) as PartnerFact[];
  },
  async add(ownerId: string, coupleId: string, partnerId: string, label: string, value: string) {
    const { error } = await supabase.from('partner_facts').insert({
      owner_id: ownerId,
      couple_id: coupleId,
      about_user_id: partnerId,
      label: label.trim(),
      value: value.trim(),
      category: 'other',
      visibility: 'shared',
    });
    fail(error, 'Bilgi eklenemedi');
  },
  async remove(id: string) {
    const { error } = await supabase.from('partner_facts').update({ is_deleted: true }).eq('id', id);
    fail(error, 'Bilgi kaldırılamadı');
  },
};
