'use client';

import { useState, useEffect } from 'react';
import { X, User, LogOut, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset: () => void;
}

export default function SettingsModal({ isOpen, onClose, onDataReset }: SettingsModalProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserEmail(user?.email || null);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
        await supabase.auth.signOut();
        router.push('/login');
    }
  };

  const handleReset = async () => {
      if (confirm('정말로 모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 지출 내역과 설정이 삭제됩니다.')) {
          onDataReset();
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold">설정</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>

        {/* Profile Section */}
        <section className="mb-8">
            <h3 className="text-sm font-medium text-text-secondary mb-3 ml-1">내 계정</h3>
            <div className="bg-black border border-border rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-base text-white">{userEmail || 'User'}</p>
                        <p className="text-xs text-text-secondary">Logged in</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-text-secondary hover:text-white transition-colors">
                    로그아웃
                </button>
            </div>
        </section>

        {/* Danger Zone */}
        <section>
            <div className="flex items-center text-danger mb-3 ml-1">
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                <h3 className="text-sm font-bold">위험 구역</h3>
            </div>
            
            <div className="bg-black border border-danger/30 rounded-2xl overflow-hidden divide-y divide-border/50">
                <button onClick={handleReset} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left group">
                    <div>
                        <h4 className="font-bold text-danger text-sm group-hover:text-danger/80">모든 데이터 초기화</h4>
                        <p className="text-xs text-text-secondary mt-0.5">지출 내역과 설정을 모두 삭제합니다.</p>
                    </div>
                    <RefreshCw className="w-4 h-4 text-text-secondary group-hover:text-danger transition-colors" />
                </button>
            </div>
        </section>

        <div className="mt-8 text-center">
            <p className="text-[10px] text-text-secondary opacity-50">Version 1.1.0</p>
        </div>
      </div>
    </div>
  );
}
