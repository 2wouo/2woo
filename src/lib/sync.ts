import { supabase } from './supabase';
import { mapRule, type Transaction } from './db';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export async function syncTransactions(targetMonth: string) {
  // 1. 활성화된 규칙 가져오기
  const { data: rulesData, error: rulesError } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', targetMonth);

  if (rulesError) throw rulesError;

  const rules = rulesData
    .map(mapRule)
    .filter(rule => !rule.endDate || rule.endDate >= targetMonth);

  // 2. 이미 생성된 이번 달 내역 확인
  const { data: existingData, error: existingError } = await supabase
    .from('transactions')
    .select('rule_id')
    .like('date', `${targetMonth}%`);

  if (existingError) throw existingError;

  const existingRuleIds = new Set(existingData.map(t => t.rule_id));

  // 3. 누락된 내역 생성
  const newTransactions = [];

  for (const rule of rules) {
    if (!existingRuleIds.has(rule.id)) {
      const payDay = Math.min(rule.payDay, 31);
      const dateStr = `${targetMonth}-${payDay.toString().padStart(2, '0')}`;
      
      let finalDateStr = dateStr;
      try {
        const d = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isNaN(d.getTime())) {
          finalDateStr = format(endOfMonth(parse(targetMonth, 'yyyy-MM', new Date())), 'yyyy-MM-dd');
        }
      } catch {
        finalDateStr = format(endOfMonth(parse(targetMonth, 'yyyy-MM', new Date())), 'yyyy-MM-dd');
      }

      newTransactions.push({
        id: uuidv4(),
        rule_id: rule.id,
        date: finalDateStr,
        title: rule.title,
        category: rule.category,
        type: rule.type,
        amount: rule.type === 'VARIABLE' ? 0 : rule.amount,
        status: rule.type === 'FIXED' ? 'DONE' : 'PENDING',
      });
    }
  }

  if (newTransactions.length > 0) {
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(newTransactions);
    if (insertError) throw insertError;
  }
}