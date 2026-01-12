'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Plus, 
  CheckCircle2, 
  Circle, 
  CreditCard, 
  Trash2, 
  List, 
  BarChart3,
  KeyRound 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mapTransaction, type Transaction, type ExpenseRule } from '@/lib/db';
import { syncTransactions } from '@/lib/sync';
import ExpenseFormModal from '@/components/ExpenseFormModal';
import DeleteConfirmModal, { type DeleteOption } from '@/components/DeleteConfirmModal';
import StatsView from '@/components/StatsView';
import AccountsView from '@/components/AccountsView';
import { cn } from '@/lib/utils';
import { subMonths, addMonths, format } from 'date-fns';

import SettingsModal from '@/components/SettingsModal';

const CATEGORY_MAP: Record<string, string> = {
    'HOUSING': '주거',
    'SUBSCRIPTION': '구독',
    'UTILITY': '공과금',
    'FINANCE': '금융',
    'ETC': '기타'
};

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editRule, setEditRule] = useState<ExpenseRule | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'STATS' | 'ACCOUNTS'>('LIST');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      }
    };
    checkUser();
  }, [router]);

  const currentMonth = format(currentDate, 'yyyy-MM');
  const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        await syncTransactions(currentMonth);
        
        const { data: currentData } = await supabase
            .from('transactions')
            .select('*')
            .like('date', `${currentMonth}%`)
            .order('date', { ascending: true });
        
        const { data: prevData } = await supabase
            .from('transactions')
            .select('*')
            .like('date', `${prevMonth}%`);

        setTransactions((currentData || []).map(mapTransaction));
        setPrevTransactions((prevData || []).map(mapTransaction));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        setIsLoading(false);
    }
  }, [currentMonth, prevMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const pendingCount = transactions.filter(t => t.status === 'PENDING' && t.date < todayStr).length;

  const handleUpdateAmount = async (id: string, amount: number) => {
    await supabase.from('transactions').update({ amount, status: 'DONE' }).eq('id', id);
    fetchData();
  };

  const handleEdit = async (transaction: Transaction) => {
      const { data } = await supabase.from('rules').select('*').eq('id', transaction.ruleId).single();
      if (data) {
          const { mapRule } = await import('@/lib/db');
          setEditRule(mapRule(data));
          setEditTransaction(transaction);
          setIsModalOpen(true);
      }
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditRule(null);
      setEditTransaction(null);
  };

  const handleDelete = async (option: DeleteOption) => {
    if (!deleteTarget) return;
    const { id, ruleId } = deleteTarget;

    if (option === 'THIS_MONTH') {
        await supabase.from('transactions').delete().eq('id', id);
    } else if (option === 'FROM_NOW') {
        await supabase.from('transactions').delete().eq('id', id);
        await supabase.from('rules').update({ end_date: prevMonth }).eq('id', ruleId);
        await supabase.from('transactions').delete().eq('rule_id', ruleId).gt('date', currentMonth);
    } else if (option === 'ALL') {
        await supabase.from('rules').delete().eq('id', ruleId);
        // Cascade delete should handle transactions if set up, but let's be sure
        await supabase.from('transactions').delete().eq('rule_id', ruleId);
    }

    setDeleteTarget(null);
    fetchData();
  };

  const handleDataReset = async () => {
    setIsLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('transactions').delete().eq('user_id', user.id);
            await supabase.from('rules').delete().eq('user_id', user.id);
            alert('모든 데이터가 초기화되었습니다.');
            fetchData();
            // Force reload to clear any component states if necessary, or just refetch
            window.location.reload(); 
        }
    } catch (error) {
        console.error('Reset failed:', error);
        alert('데이터 초기화 중 오류가 발생했습니다.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <header className="flex items-center justify-between py-4 mb-2">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">{format(currentDate, 'yyyy.MM')}</h1>
        <div className="flex items-center">
             <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors mr-1">
                <ChevronRight className="w-6 h-6" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Settings className="w-5 h-5 text-text-secondary" />
            </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-surface p-1 rounded-xl mb-6 border border-border">
          <button onClick={() => setActiveTab('LIST')} className={cn("flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === 'LIST' ? "bg-white/10 text-white" : "text-text-secondary")}>
              <List className="w-4 h-4 mr-2" />
              지출 목록
          </button>
          <button onClick={() => setActiveTab('STATS')} className={cn("flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === 'STATS' ? "bg-white/10 text-white" : "text-text-secondary")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              지출 통계
          </button>
          <button onClick={() => setActiveTab('ACCOUNTS')} className={cn("flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === 'ACCOUNTS' ? "bg-white/10 text-white" : "text-text-secondary")}>
              <KeyRound className="w-4 h-4 mr-2" />
              계정 관리
          </button>
      </div>

      {activeTab === 'LIST' ? (
          <div className="flex flex-col flex-1 space-y-6 animate-in fade-in duration-300">
            {/* Summary Cards */}
            <section className="grid grid-cols-1 gap-3">
                <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20 shadow-sm flex justify-between items-center">
                    <div>
                        <span className="text-primary/70 text-[10px] font-bold uppercase tracking-wider">이번 달 총액</span>
                        <div className="text-2xl font-bold text-white mt-0.5">
                            {totalAmount.toLocaleString()} <span className="text-sm font-normal opacity-60">원</span>
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <div className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded-lg">
                            미입력 {pendingCount}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface border border-border p-4 rounded-2xl">
                        <span className="text-text-secondary text-[10px] font-bold uppercase tracking-wider">고정 지출</span>
                        <div className="text-lg font-bold text-white mt-0.5">
                            {transactions.filter(t => t.type === 'FIXED').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-xs font-normal opacity-50">원</span>
                        </div>
                    </div>
                    <div className="bg-variable/5 border border-variable/20 p-4 rounded-2xl">
                        <span className="text-variable/70 text-[10px] font-bold uppercase tracking-wider">변동 지출</span>
                        <div className="text-lg font-bold text-variable mt-0.5">
                            {transactions.filter(t => t.type === 'VARIABLE').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-xs font-normal opacity-50">원</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Transaction List */}
            <div className="flex-1 space-y-3 overflow-y-auto pb-24">
                {isLoading ? (
                    <div className="h-32 flex items-center justify-center text-text-secondary text-sm">로딩 중...</div>
                ) : transactions.length > 0 ? (
                    [...transactions].sort((a, b) => a.status === b.status ? 0 : (a.status === 'PENDING' ? -1 : 1)).map((t) => (
                        <TransactionItem 
                            key={t.id} 
                            transaction={t} 
                            onUpdateAmount={handleUpdateAmount}
                            onEdit={handleEdit}
                            onDelete={() => setDeleteTarget(t)}
                        />
                    ))
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-text-secondary space-y-4">
                        <CreditCard className="w-12 h-12 opacity-10" />
                        <p className="text-sm">등록된 지출 내역이 없습니다.</p>
                    </div>
                )}
            </div>
          </div>
      ) : activeTab === 'STATS' ? (
          <StatsView transactions={transactions} prevMonthTransactions={prevTransactions} />
      ) : (
          <AccountsView />
      )}

      {/* FAB */}
      {(activeTab === 'LIST' || activeTab === 'ACCOUNTS') && (
          <div className="fixed bottom-8 right-8">
            <button onClick={() => { setEditRule(null); setEditTransaction(null); setIsModalOpen(true); }} className="p-4 bg-primary rounded-full shadow-lg hover:bg-primary-hover transition-all active:scale-90">
                <Plus className="w-6 h-6 text-white" />
            </button>
          </div>
      )}

      <ExpenseFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSuccess={fetchData} 
        initialData={editRule}
        initialTransaction={editTransaction}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataReset={handleDataReset}
      />
    </div>
  );
}

function TransactionItem({ transaction, onUpdateAmount, onEdit, onDelete }: { 
    transaction: Transaction,
    onUpdateAmount: (id: string, amount: number) => void,
    onEdit: (t: Transaction) => void,
    onDelete: () => void
}) {
    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [editValue, setEditValue] = useState(transaction.amount.toString());

    useEffect(() => {
        setEditValue(transaction.amount.toString());
    }, [transaction.amount]);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isPending = transaction.status === 'PENDING';
    const isOverdue = isPending && transaction.date < todayStr;
    const isUpcoming = isPending && transaction.date >= todayStr;
    const isVariable = transaction.type === 'VARIABLE';

    const handleBlur = () => {
        const val = Number(editValue);
        if (!isNaN(val) && val !== transaction.amount) {
            onUpdateAmount(transaction.id, val);
        }
        setIsEditingAmount(false);
    };

    return (
        <div onClick={() => onEdit(transaction)} className={cn("card p-4 flex items-center justify-between group cursor-pointer", isOverdue ? (isVariable ? "border-variable/50 bg-variable/5 shadow-sm" : "border-primary/50 bg-primary/5 shadow-sm") : isUpcoming ? "opacity-70" : "")}>
            <div className="flex items-center space-x-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", 
                    isOverdue 
                        ? (isVariable ? "bg-variable text-white" : "bg-primary text-white") 
                        : (isVariable ? "bg-variable/20 text-variable" : "bg-primary/20 text-primary")
                )}>
                    {isPending ? <Circle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                    <h3 className="font-medium text-sm">{transaction.title}</h3>
                    <div className="flex items-center space-x-2 text-[10px] text-text-secondary uppercase">
                        <span className={cn(
                            "font-bold",
                            isVariable ? "text-variable/80" : "text-primary/80"
                        )}>{transaction.date.split('-')[2]}일</span>
                        <span>•</span>
                        <span>{CATEGORY_MAP[transaction.category]}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <div className="text-right" onClick={(e) => { e.stopPropagation(); if (isVariable) setIsEditingAmount(true); }}>
                    {isEditingAmount || (isPending && transaction.amount === 0 && !isUpcoming) ? (
                        <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && handleBlur()} className={cn("bg-black border rounded-md px-2 py-1 w-20 text-right text-sm", isVariable ? "border-variable" : "border-primary")} />
                    ) : (
                        <div className={cn("text-base font-semibold", isOverdue ? (isVariable ? "text-variable" : "text-primary") : "text-white")}>
                            {transaction.amount > 0 ? transaction.amount.toLocaleString() : "예정"} 
                            {transaction.amount > 0 && <span className="ml-1 text-[10px] font-normal opacity-70">원</span>}
                        </div>
                    )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-text-secondary hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
