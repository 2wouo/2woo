'use client';

import { X, AlertCircle } from 'lucide-react';

export type DeleteOption = 'THIS_MONTH' | 'FROM_NOW' | 'ALL';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (option: DeleteOption) => void;
  title: string;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center space-x-3 text-danger mb-4">
          <AlertCircle className="w-6 h-6" />
          <h2 className="text-lg font-bold">항목 삭제</h2>
        </div>
        
        <p className="text-text-secondary text-sm mb-6">
          <span className="text-white font-medium">"{title}"</span> 항목을 어떻게 삭제하시겠습니까?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onConfirm('THIS_MONTH')}
            className="w-full text-left p-4 rounded-2xl border border-border hover:border-white/20 transition-colors bg-white/5 group"
          >
            <div className="font-bold text-sm group-hover:text-white">이번 달만 삭제</div>
            <div className="text-[11px] text-text-secondary mt-1">이전/다음 달 기록은 유지됩니다.</div>
          </button>

          <button
            onClick={() => onConfirm('FROM_NOW')}
            className="w-full text-left p-4 rounded-2xl border border-primary/30 hover:border-primary transition-colors bg-primary/5 group"
          >
            <div className="font-bold text-sm text-primary group-hover:text-primary">이번 달부터 삭제</div>
            <div className="text-[11px] text-text-secondary mt-1 text-primary/70">앞으로의 모든 자동 생성에서 제외됩니다.</div>
          </button>

          <button
            onClick={() => {
                if (confirm('모든 기록이 사라집니다. 정말 삭제하시겠습니까?')) {
                    onConfirm('ALL');
                }
            }}
            className="w-full text-left p-4 rounded-2xl border border-danger/20 hover:border-danger/40 transition-colors hover:bg-danger/5 opacity-50 hover:opacity-100"
          >
            <div className="font-bold text-sm text-danger">완전 삭제</div>
            <div className="text-[11px] text-text-secondary mt-1">과거 데이터를 포함한 모든 기록을 제거합니다.</div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 text-text-secondary hover:text-white transition-colors text-sm"
        >
          취소
        </button>
      </div>
    </div>
  );
}
