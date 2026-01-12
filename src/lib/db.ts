import { supabase } from './supabase';

export type Category = 'HOUSING' | 'SUBSCRIPTION' | 'UTILITY' | 'FINANCE' | 'ETC';
export type ExpenseType = 'FIXED' | 'VARIABLE';
export type Status = 'PENDING' | 'DONE';

export interface ExpenseRule {
  id: string;
  title: string;
  category: Category;
  type: ExpenseType;
  amount: number;
  payDay: number;
  startDate: string; 
  endDate: string | null;
  isActive: boolean;
  createdAt: number;
  siteUrl?: string;
  username?: string;
  password?: string;
  billingMemo?: string;
}

export interface Transaction {
  id: string;
  ruleId: string;
  date: string;
  title: string;
  category: Category;
  type: ExpenseType;
  amount: number;
  status: Status;
  memo?: string;
}

// Helper to map DB snake_case to JS camelCase
export const mapRule = (row: any): ExpenseRule => ({
  id: row.id,
  title: row.title,
  category: row.category,
  type: row.type,
  amount: Number(row.amount),
  payDay: row.pay_day,
  startDate: row.start_date,
  endDate: row.end_date,
  isActive: row.is_active,
  createdAt: Number(row.created_at),
  siteUrl: row.site_url,
  username: row.username,
  password: row.password,
  billingMemo: row.billing_memo
});

export const mapTransaction = (row: any): Transaction => ({
  id: row.id,
  ruleId: row.rule_id,
  date: row.date,
  title: row.title,
  category: row.category,
  type: row.type,
  amount: Number(row.amount),
  status: row.status,
  memo: row.memo
});