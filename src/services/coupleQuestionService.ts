import { supabase } from '@/src/lib/supabase';
import { CoupleQuestionId } from '@/src/constants/coupleQuestions';

export interface CoupleQuestionAnswer {
  id: string;
  couple_id: string;
  question_id: CoupleQuestionId;
  owner_id: string;
  answer: string;
  updated_at: string;
}

export const coupleQuestionService = {
  async list(coupleId: string): Promise<CoupleQuestionAnswer[]> {
    const { data, error } = await supabase
      .from('couple_question_answers')
      .select('id,couple_id,question_id,owner_id,answer,updated_at')
      .eq('couple_id', coupleId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Yanıtlar yüklenemedi: ${error.message}`);
    return (data ?? []) as CoupleQuestionAnswer[];
  },

  async save(coupleId: string, ownerId: string, questionId: CoupleQuestionId, answer: string): Promise<void> {
    const cleaned = answer.trim();
    if (!cleaned) throw new Error('Yanıtınızı yazın.');
    if (cleaned.length > 1000) throw new Error('Yanıt en fazla 1000 karakter olabilir.');
    const { error } = await supabase.from('couple_question_answers').upsert({
      couple_id: coupleId,
      question_id: questionId,
      owner_id: ownerId,
      answer: cleaned,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'couple_id,question_id,owner_id' });
    if (error) throw new Error(`Yanıt kaydedilemedi: ${error.message}`);
  },
};
