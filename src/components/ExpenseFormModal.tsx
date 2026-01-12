'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Repeat, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type Category, type ExpenseType, type ExpenseRule, type Transaction } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ExpenseRule | null;
  initialTransaction?: Transaction | null;
}

const CATEGORIES: { label: string; value: Category }[] = [
  { label: '주거', value: 'HOUSING' },
  { label: '구독', value: 'SUBSCRIPTION' },
  { label: '공과금', value: 'UTILITY' },
  { label: '금융', value: 'FINANCE' },
  { label: '기타', value: 'ETC' },
];

export default function ExpenseFormModal({ isOpen, onClose, onSuccess, initialData, initialTransaction }: ExpenseFormModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('ETC');
  const [type, setType] = useState<ExpenseType>('FIXED');
  const [amount, setAmount] = useState('');
  const [payDay, setPayDay] = useState('1');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM'));
  const [isOneTime, setIsOneTime] = useState(false);

  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [billingMemo, setBillingMemo] = useState('');
  const [monthlyMemo, setMonthlyMemo] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCategory(initialData.category);
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setPayDay(initialData.payDay.toString());
      setStartDate(initialData.startDate);
      setIsOneTime(!!initialData.endDate && initialData.startDate === initialData.endDate);
      setSiteUrl(initialData.siteUrl || '');
      setUsername(initialData.username || '');
      setPassword(initialData.password || '');
      setBillingMemo(initialData.billingMemo || '');
      setShowAccountInfo(!!(initialData.siteUrl || initialData.username || initialData.password || initialData.billingMemo));
      setMonthlyMemo(initialTransaction?.memo || '');
    } else {
      setTitle(''); setCategory('ETC'); setType('FIXED'); setAmount(''); setPayDay('1');
      setStartDate(format(new Date(), 'yyyy-MM')); setIsOneTime(false);
      setSiteUrl(''); setUsername(''); setPassword(''); setBillingMemo(''); setMonthlyMemo('');
      setShowAccountInfo(false);
    }
  }, [initialData, initialTransaction, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ruleData = {
      title,
      category,
      type,
      amount: Number(amount) || 0,
      pay_day: Number(payDay),
      start_date: startDate,
      end_date: isOneTime ? startDate : null,
      is_active: true,
      created_at: initialData ? initialData.createdAt : Date.now(),
      site_url: siteUrl,
      username,
      password,
      billing_memo: billingMemo
    };

    try {
      if (initialData) {
        await supabase.from('rules').update(ruleData).eq('id', initialData.id);
        const currentMonth = format(new Date(), 'yyyy-MM');
        
        // 이번 달 내역도 업데이트
        await supabase.from('transactions')
            .update({
                title: ruleData.title,
                category: ruleData.category,
                type: ruleData.type,
                amount: ruleData.type === 'FIXED' ? ruleData.amount : undefined,
            })
            .eq('rule_id', initialData.id)
            .like('date', `${currentMonth}%`);

        if (initialTransaction) {
            await supabase.from('transactions').update({ memo: monthlyMemo }).eq('id', initialTransaction.id);
        }
      } else {
        const newId = uuidv4();
        await supabase.from('rules').insert({ ...ruleData, id: newId });
        
        const currentMonth = format(new Date(), 'yyyy-MM');
        if (startDate <= currentMonth && (!ruleData.end_date || ruleData.end_date >= currentMonth)) {
            await supabase.from('transactions').insert({
                id: uuidv4(),
                rule_id: newId,
                date: `${currentMonth}-${payDay.padStart(2, '0')}`,
                title: ruleData.title,
                category: ruleData.category,
                type: ruleData.type,
                amount: ruleData.amount,
                status: ruleData.type === 'FIXED' ? 'DONE' : 'PENDING',
            });
        }
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{initialData ? '지출 항목 수정' : '고정비 항목 등록'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 ml-1">항목명</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 월세, 넷플릭스" className="w-full bg-black border border-border rounded-xl px-4 py-3 focus:border-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 ml-1">카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full bg-black border border-border rounded-xl px-4 py-3 outline-none">
                {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 ml-1">유형</label>
              <div className="flex bg-black border border-border rounded-xl p-1">
                <button type="button" onClick={() => setType('FIXED')} className={cn("flex-1 py-2 text-sm rounded-lg", type === 'FIXED' ? "bg-primary text-white" : "text-text-secondary")}>고정</button>
                <button type="button" onClick={() => setType('VARIABLE')} className={cn("flex-1 py-2 text-sm rounded-lg", type === 'VARIABLE' ? "bg-primary text-white" : "text-text-secondary")}>변동</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">{type === 'FIXED' ? '금액' : '예상 금액 (선택)'}</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-black border border-border rounded-xl px-4 py-3 outline-none" />
            </div>
            <div>
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">결제일</label>
                <div className="relative">
                    <input required type="number" min="1" max="31" value={payDay} onChange={(e) => setPayDay(e.target.value)} className="w-full bg-black border border-border rounded-xl px-4 py-3 outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">일</span>
                </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">시작 월</label>
                <input required type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-black border border-border rounded-xl px-4 py-3 outline-none" />
            </div>
            <div>
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">반복 설정</label>
                <button type="button" onClick={() => setIsOneTime(!isOneTime)} className={cn("w-full flex items-center justify-center space-x-2 border rounded-xl px-4 py-3", isOneTime ? "bg-white/10 text-white" : "bg-black border-border text-text-secondary")}>
                    {isOneTime ? <><Calendar className="w-4 h-4" /> <span className="text-sm">이번 달만</span></> : <><Repeat className="w-4 h-4" /> <span className="text-sm">매월 반복</span></>}
                </button>
            </div>
          </div>
          {initialTransaction && (
             <div className="pt-2">
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">이번 달 메모</label>
                <textarea value={monthlyMemo} onChange={(e) => setMonthlyMemo(e.target.value)} placeholder="이번 달 특이사항" rows={2} className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none resize-none" />
            </div>
          )}
          <div className="pt-2">
            <button type="button" onClick={() => setShowAccountInfo(!showAccountInfo)} className="flex items-center justify-between w-full p-2 text-sm text-text-secondary hover:text-white">
                <div className="flex items-center"><Lock className="w-4 h-4 mr-2" /> 계정 및 메모 (매월 동일)</div>
                {showAccountInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAccountInfo && (
                <div className="space-y-4 pt-3 pb-2">
                    <input type="text" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="사이트 URL" className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="아이디" className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm outline-none" />
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm outline-none" />
                    </div>
                    <textarea value={billingMemo} onChange={(e) => setBillingMemo(e.target.value)} placeholder="결제 수단 메모" rows={2} className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm outline-none resize-none" />
                </div>
            )}
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl mt-4 transition-all">
            {initialData ? '수정 완료' : '등록 완료'}
          </button>
        </form>
      </div>
    </div>
  );
}
