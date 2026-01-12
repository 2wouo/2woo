'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LabelList } from 'recharts';
import { type Transaction } from '@/lib/db';

interface StatsViewProps {
  transactions: Transaction[];
  prevMonthTransactions: Transaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  HOUSING: '#818CF8',      // Pastel Indigo (주거)
  SUBSCRIPTION: '#F472B6', // Pastel Pink (구독)
  UTILITY: '#34D399',      // Pastel Emerald (공과금)
  FINANCE: '#FBBF24',      // Pastel Amber (금융)
  ETC: '#A78BFA',          // Pastel Purple (기타)
};

const CATEGORY_LABELS: Record<string, string> = {
  HOUSING: '주거',
  SUBSCRIPTION: '구독',
  UTILITY: '공과금',
  FINANCE: '금융',
  ETC: '기타'
};

const formatAmount = (value: any) => {
    if (typeof value === 'number' && value >= 10000) {
        return `${(value / 10000).toFixed(1)}만`;
    }
    return value.toLocaleString();
};

export default function StatsView({ transactions, prevMonthTransactions }: StatsViewProps) {
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: CATEGORY_LABELS[name] || name,
      key: name,
      value,
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalFixed = transactions.filter(t => t.type === 'FIXED').reduce((sum, t) => sum + t.amount, 0);
  const totalVariable = transactions.filter(t => t.type === 'VARIABLE').reduce((sum, t) => sum + t.amount, 0);

  const prevTotal = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const diff = currentTotal - prevTotal;

  const prevVariableTotal = prevMonthTransactions.filter(t => t.type === 'VARIABLE').reduce((sum, t) => sum + t.amount, 0);
  const currentVariableTotal = totalVariable;
  const variableDiff = currentVariableTotal - prevVariableTotal;

  const compareData = [
    { name: '지난달', amount: prevTotal },
    { name: '이번달', amount: currentTotal },
  ];

  const variableCompareData = [
    { name: '지난달', amount: prevVariableTotal },
    { name: '이번달', amount: currentVariableTotal },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="space-y-4">
        <div className="card p-5 bg-surface/50 border-primary/20 flex justify-between items-center">
             <div>
                <span className="text-primary/70 text-[10px] font-bold uppercase tracking-wider">이번 달 총 지출</span>
                <div className="text-2xl font-bold text-white mt-0.5">
                    {currentTotal.toLocaleString()} <span className="text-sm font-normal opacity-60">원</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
                <span className="text-[10px] text-text-secondary uppercase">고정 지출</span>
                <div className="text-lg font-bold mt-1">{totalFixed.toLocaleString()}원</div>
            </div>
            <div className="card p-4">
                <span className="text-[10px] text-text-secondary uppercase">변동 지출</span>
                <div className="text-lg font-bold mt-1 text-variable">{totalVariable.toLocaleString()}원</div>
            </div>
        </div>
      </div>

      {/* Pie Chart */}
      <section>
        <h3 className="text-sm font-bold mb-4 px-1">카테고리별 비중</h3>
        <div className="card p-6 h-[240px] flex items-center">
            <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    >
                    {categoryData.map((entry) => (
                        <Cell key={`cell-${entry.key}`} fill={CATEGORY_COLORS[entry.key] || '#8884d8'} />
                    ))}
                    </Pie>
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
                {categoryData.slice(0, 4).map((item) => (
                    <div key={item.key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CATEGORY_COLORS[item.key] }} />
                            <span className="text-text-secondary">{item.name}</span>
                        </div>
                        <span className="font-medium">{((item.value / currentTotal) * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Total Comparison */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="text-sm font-bold">전체 지출 비교</h3>
            <span className={cn(
                "text-xs font-bold",
                diff > 0 ? "text-danger" : "text-primary"
            )}>
                {diff > 0 ? '+' : ''}{diff.toLocaleString()}원 {diff > 0 ? '증가' : '감소'}
            </span>
        </div>
        <div className="card p-6 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 20 }}>
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                    />
                    <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#121212', border: '1px solid #27272A', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value?: number) => [`${(value || 0).toLocaleString()}원`, '금액']}
                    />
                    <Bar 
                        dataKey="amount" 
                        radius={[4, 4, 0, 0]} 
                        fill="#3B82F6" 
                        barSize={40}
                    >
                        <LabelList dataKey="amount" position="top" formatter={formatAmount} style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </section>

      {/* Variable Expense Comparison */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="text-sm font-bold">변동비 전월 비교</h3>
            <span className={cn(
                "text-xs font-bold",
                variableDiff > 0 ? "text-danger" : "text-primary"
            )}>
                {variableDiff > 0 ? '+' : ''}{variableDiff.toLocaleString()}원 {variableDiff > 0 ? '증가' : '감소'}
            </span>
        </div>
        <div className="card p-6 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={variableCompareData} margin={{ top: 20 }}>
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                    />
                    <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#121212', border: '1px solid #27272A', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value?: number) => [`${(value || 0).toLocaleString()}원`, '금액']}
                    />
                    <Bar 
                        dataKey="amount" 
                        radius={[4, 4, 0, 0]} 
                        fill="#F472B6" 
                        barSize={40}
                    >
                        <LabelList dataKey="amount" position="top" formatter={formatAmount} style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

import { cn } from '@/lib/utils';
