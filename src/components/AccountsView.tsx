'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, KeyRound, CreditCard, LogOut, User, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mapRule, type ExpenseRule } from '@/lib/db';
import { cn } from '@/lib/utils';
import ExpenseFormModal from './ExpenseFormModal';
import { useRouter } from 'next/navigation';

export default function AccountsView() {
  const [editingRule, setEditingRule] = useState<ExpenseRule | null>(null);
  const [rules, setRules] = useState<ExpenseRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
        await supabase.auth.signOut();
        router.push('/login');
    }
  };

  const handleResetData = async () => {
    if (confirm('정말로 모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 지출 내역과 설정이 삭제됩니다.')) {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('transactions').delete().eq('user_id', user.id);
                await supabase.from('rules').delete().eq('user_id', user.id);
                alert('모든 데이터가 초기화되었습니다.');
                fetchRules(); // 리스트 갱신
            }
        } catch (error) {
            console.error('Reset failed:', error);
            alert('데이터 초기화 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    }
  };

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
        const { data } = await supabase
            .from('rules')
            .select('*')
            .eq('is_active', true);
        
        setRules((data || []).map(mapRule));
    } catch (error) {
        console.error('Error fetching rules:', error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    supabase.auth.getUser().then(({ data: { user } }) => {
        setUserEmail(user?.email || null);
    });
  }, [fetchRules]);

  const sortedRules = [...rules].sort((a, b) => {
    const aHasCreds = !!(a.username || a.password || a.billingMemo);
    const bHasCreds = !!(b.username || b.password || b.billingMemo);
    if (aHasCreds && !bHasCreds) return -1;
    if (!aHasCreds && bHasCreds) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Profile Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-0.5">Logged in as</p>
                <p className="font-bold text-lg text-white">{userEmail || 'User'}</p>
            </div>
        </div>
        <button 
            onClick={handleLogout} 
            className="p-3 text-text-secondary hover:text-danger hover:bg-white/5 rounded-xl transition-all"
            aria-label="로그아웃"
        >
            <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="px-1">
            <h3 className="font-bold text-lg mb-1">계정 정보 관리</h3>
            <p className="text-sm text-text-secondary">
                지출 항목에 연결된 결제 사이트 계정과 메모를 관리합니다.
            </p>
        </div>

        <div className="space-y-3">
            {isLoading ? (
                <div className="h-32 flex items-center justify-center text-text-secondary text-sm">로딩 중...</div>
            ) : sortedRules.map((rule) => (
            <AccountItem 
                key={rule.id} 
                rule={rule} 
                onEdit={() => setEditingRule(rule)}
            />
            ))}
            
            {!isLoading && sortedRules.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-text-secondary space-y-2 border border-dashed border-border rounded-2xl">
                <KeyRound className="w-8 h-8 opacity-20" />
                <p className="text-sm">등록된 항목이 없습니다.</p>
            </div>
            )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div className="px-1 flex items-center text-danger">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <h3 className="font-bold text-lg">위험 구역</h3>
        </div>
        
        <div className="card border-danger/30 overflow-hidden divide-y divide-border/50">
            <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={handleResetData}>
                <div>
                    <h4 className="font-bold text-danger text-sm">모든 데이터 초기화</h4>
                    <p className="text-xs text-text-secondary mt-0.5">등록된 모든 지출 내역과 설정을 삭제합니다.</p>
                </div>
                <RefreshCw className="w-5 h-5 text-text-secondary" />
            </div>
            {/* 
            <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer opacity-50 cursor-not-allowed">
                <div>
                    <h4 className="font-bold text-danger text-sm">회원 탈퇴 (준비 중)</h4>
                    <p className="text-xs text-text-secondary mt-0.5">계정과 모든 데이터를 영구적으로 삭제합니다.</p>
                </div>
                <Trash2 className="w-5 h-5 text-text-secondary" />
            </div>
            */}
        </div>
      </div>

      <ExpenseFormModal
        isOpen={!!editingRule}
        onClose={() => setEditingRule(null)}
        onSuccess={fetchRules}
        initialData={editingRule}
      />
    </div>
  );
}

function AccountItem({ rule, onEdit }: { rule: ExpenseRule, onEdit: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasCredentials = !!(rule.siteUrl || rule.username || rule.password || rule.billingMemo);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg",
                hasCredentials ? "bg-white/10 text-white" : "bg-white/5 text-text-secondary"
            )}>
                {rule.title.charAt(0)}
            </div>
            <div>
                <h3 className="font-bold text-base">{rule.title}</h3>
                <span className="text-xs text-text-secondary">{
                    rule.category === 'HOUSING' ? '주거' :
                    rule.category === 'SUBSCRIPTION' ? '구독' :
                    rule.category === 'UTILITY' ? '공과금' : 
                    rule.category === 'FINANCE' ? '금융' : '기타'
                }</span>
            </div>
        </div>
        <button onClick={onEdit} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-text-secondary hover:text-white">수정</button>
      </div>

      {hasCredentials ? (
        <div className="space-y-3 pt-2 border-t border-border/50">
            {rule.siteUrl && (
                <a href={rule.siteUrl.startsWith('http') ? rule.siteUrl : `https://${rule.siteUrl}`} target="_blank" rel="noreferrer" className="flex items-center text-xs text-primary hover:underline truncate">
                    <ExternalLink className="w-3 h-3 mr-1.5" />{rule.siteUrl}
                </a>
            )}
            {(rule.username || rule.password) && (
                <div className="grid grid-cols-1 gap-2">
                    {rule.username && (
                        <div className="flex items-center justify-between bg-black rounded-lg px-3 py-2 border border-border">
                            <span className="text-xs text-text-secondary w-8">ID</span>
                            <span className="text-sm font-mono flex-1 mx-2 truncate">{rule.username}</span>
                            <button onClick={() => copyToClipboard(rule.username!, 'id')}>
                                {copiedField === 'id' ? <span className="text-[10px] text-primary">복사됨</span> : <Copy className="w-3.5 h-3.5 text-text-secondary hover:text-white" />}
                            </button>
                        </div>
                    )}
                    {rule.password && (
                        <div className="flex items-center justify-between bg-black rounded-lg px-3 py-2 border border-border">
                            <span className="text-xs text-text-secondary w-8">PW</span>
                            <div className="flex-1 mx-2 flex items-center">
                                <span className="text-sm font-mono truncate">{showPassword ? rule.password : '•'.repeat(rule.password.length)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="w-3.5 h-3.5 text-text-secondary hover:text-white" /> : <Eye className="w-3.5 h-3.5 text-text-secondary hover:text-white" />}</button>
                                <button onClick={() => copyToClipboard(rule.password!, 'pw')}>{copiedField === 'pw' ? <span className="text-[10px] text-primary">복사됨</span> : <Copy className="w-3.5 h-3.5 text-text-secondary hover:text-white" />}</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {rule.billingMemo && (
                <div className="flex items-start bg-primary/5 rounded-lg px-3 py-2 border border-primary/10">
                    <CreditCard className="w-3.5 h-3.5 text-primary mt-0.5 mr-2 shrink-0" />
                    <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{rule.billingMemo}</p>
                </div>
            )}
        </div>
      ) : (
        <div onClick={onEdit} className="pt-2 border-t border-border/50 text-center cursor-pointer group">
            <span className="text-xs text-text-secondary group-hover:text-primary transition-colors">+ 계정 정보 등록하기</span>
        </div>
      )}
    </div>
  );
}