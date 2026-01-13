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
        
        // 규칙이 변경되면, 이번 달을 포함한 미래의 모든 해당 지출 내역을 일괄 업데이트
        const currentMonth = format(new Date(), 'yyyy-MM');
        
        // 날짜 계산 로직: 각 트랜잭션의 원래 '년-월'은 유지하되, 일(Day)만 변경해야 함
        // 하지만 SQL만으로는 '일'만 바꾸기가 까다로움. 
        // 일단 단순화를 위해: 제목, 카테고리, 금액, 타입은 일괄 업데이트하고
        // 날짜는 '이번 달' 내역에 대해서만 정확히 payDay로 맞춤 (미래 내역 날짜까지 다 바꾸면 복잡해질 수 있음)
        // 사용자가 "이름 잘못 입력해서 수정"하는 경우를 위해 제목/카테고리/금액은 미래 내역까지 싹 바꿈.

        await supabase.from('transactions')
            .update({
                title: ruleData.title,
                category: ruleData.category,
                type: ruleData.type,
                amount: ruleData.type === 'FIXED' ? ruleData.amount : undefined,
                // 주의: 날짜는 여기서 일괄 변경하면 모든 미래 내역이 '이번 달'로 덮어씌워질 위험이 있음.
                // 따라서 날짜 변경은 '이번 달' 내역에 대해서만 수행하거나, 별도 로직이 필요함.
                // 여기서는 제목/정보 수정이 주 목적이므로 날짜 제외하고 정보만 업데이트.
            })
            .eq('rule_id', initialData.id)
            .gte('date', `${currentMonth}-01`);

        // 날짜(결제일)가 변경된 경우, 이번 달 내역은 확실하게 날짜를 맞춰줌
        if (initialData.payDay !== ruleData.pay_day) {
             const targetDate = `${currentMonth}-${payDay.padStart(2, '0')}`;
             
             // 만약 initialTransaction이 있다면 그걸 우선 업데이트 (목록에서 클릭한 경우)
             if (initialTransaction) {
                 await supabase.from('transactions')
                    .update({ date: targetDate })
                    .eq('id', initialTransaction.id);
             } else {
                 // 아니면 이번 달 내역 검색해서 업데이트
                 await supabase.from('transactions')
                    .update({ date: targetDate })
                    .eq('rule_id', initialData.id)
                    .like('date', `${currentMonth}%`);
             }
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
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 월세, 넷플릭스" className="w-full h-[50px] bg-black border border-border rounded-xl px-4 focus:border-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 ml-1">카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full h-[50px] bg-black border border-border rounded-xl px-4 outline-none">
                {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 ml-1">유형</label>
              <div className="flex h-[50px] bg-black border border-border rounded-xl p-1">
                <button type="button" onClick={() => setType('FIXED')} className={cn("flex-1 text-sm rounded-lg transition-colors", type === 'FIXED' ? "bg-primary text-white" : "text-text-secondary hover:text-white")}>고정</button>
                <button type="button" onClick={() => setType('VARIABLE')} className={cn("flex-1 text-sm rounded-lg transition-colors", type === 'VARIABLE' ? "bg-variable text-white" : "text-text-secondary hover:text-white")}>변동</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">{type === 'FIXED' ? '금액' : '예상 금액 (선택)'}</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full h-[50px] bg-black border border-border rounded-xl px-4 outline-none" />
            </div>
            <div>
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">결제일</label>
                <div className="relative">
                    <input required type="number" min="1" max="31" value={payDay} onChange={(e) => setPayDay(e.target.value)} className="w-full h-[50px] bg-black border border-border rounded-xl px-4 outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">일</span>
                </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="min-w-0 overflow-hidden">
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">시작 월</label>
                <input required type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full min-w-0 h-[50px] bg-black border border-border rounded-xl px-4 outline-none" />
            </div>
            <div className="min-w-0">
                <label className="block text-sm text-text-secondary mb-1.5 ml-1">반복 설정</label>
                <button type="button" onClick={() => setIsOneTime(!isOneTime)} className={cn("w-full h-[50px] flex items-center justify-center space-x-2 border rounded-xl px-4", isOneTime ? "bg-white/10 text-white border-white/20" : "bg-black border-border text-text-secondary")}>
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
