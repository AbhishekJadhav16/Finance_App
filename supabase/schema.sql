-- PrimeWealth - Supabase Free Tier Schema
-- Run this in Supabase Dashboard > SQL Editor to create tables

-- Transactions (income/expense)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

-- Stocks (holdings and sold)
CREATE TABLE IF NOT EXISTS stocks (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  buy_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  invested_amount NUMERIC NOT NULL,
  buy_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'HOLDING' CHECK (status IN ('HOLDING', 'SOLD')),
  sell_price NUMERIC,
  sell_date DATE,
  sell_value NUMERIC,
  profit_or_loss NUMERIC,
  current_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stocks_user_id ON stocks(user_id);

-- Custom categories (one row per user, JSON)
CREATE TABLE IF NOT EXISTS custom_categories (
  user_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{"expense":[],"income":[]}'
);

-- Goal settings (one row per user)
CREATE TABLE IF NOT EXISTS goal_settings (
  user_id TEXT PRIMARY KEY,
  goal_amount NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional - allows anon to read/write by user_id; tighten in production)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_settings ENABLE ROW LEVEL SECURITY;

-- Policies: allow all for anon key (app uses user_id to scope; for free tier simplicity)
CREATE POLICY "Allow all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for stocks" ON stocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for custom_categories" ON custom_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for goal_settings" ON goal_settings FOR ALL USING (true) WITH CHECK (true);
