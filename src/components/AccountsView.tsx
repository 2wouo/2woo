'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, KeyRound, CreditCard, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mapRule, type ExpenseRule } from '@/lib/db';
import { cn } from '@/lib/utils';
import ExpenseFormModal from './ExpenseFormModal';
import { useRouter } from 'next/navigation';

export default function AccountsView() {
  const [editingRule, setEditingRule] = useState<ExpenseRule | null>(null);
  const [rules, setRules] = useState<ExpenseRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
        await supabase.auth.signOut();
        router.push('/login');
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
  }, [fetchRules]);

  const sortedRules = [...rules].sort((a, b) => {
    const aHasCreds = !!(a.username || a.password || a.billingMemo);
    const bHasCreds = !!(b.username || b.password || b.billingMemo);
    if (aHasCreds && !bHasCreds) return -1;
    if (!aHasCreds && bHasCreds) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
          <div className="text-sm text-text-secondary">
            결제 사이트 정보와 수단 메모를 관리합니다.
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center text-xs text-text-secondary hover:text-danger transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            로그아웃
          </button>
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
          <div className="h-40 flex flex-col items-center justify-center text-text-secondary space-y-2">
             <KeyRound className="w-8 h-8 opacity-20" />
             <p className="text-sm">등록된 항목이 없습니다.</p>
          </div>
        )}
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