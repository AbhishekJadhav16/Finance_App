# PrimeWealth

A personal finance management app built with React (Vite). Track transactions, budgets, goals, and stock investments. Supports **4 hardcoded users** via environment variables, optional **Supabase** backend (free tier), and deployment on **Netlify**. The UI is **mobile responsive**.

---

## Features

- **Dashboard** – Balance, income, expenses, savings rate, charts, emergency fund
- **Transactions** – Add/edit/delete income and expenses with categories
- **Budget** – Set category budgets and track spending
- **Goal Setter** – Plan how long it takes to reach a savings goal
- **Stocks** – Track buy/sell and profit/loss
- **Multi-user login** – Up to 4 users configured via env (secrets on Netlify)
- **Backend** – Supabase (free tier) or localStorage
- **Mobile responsive** – Works on phones and tablets

---

## Local development

### 1. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2. Environment variables (optional)

Copy `.env.example` to `.env` and set:

- **Login (4 users):**  
  `VITE_LOGIN_USER_1`, `VITE_LOGIN_PASS_1` … `VITE_LOGIN_USER_4`, `VITE_LOGIN_PASS_4`  
  If none are set, default login is `admin` / `admin123`.

- **Supabase (optional):**  
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
  If not set, the app uses **localStorage** only.

---

## Deploy on Netlify

### 1. Build settings

In **Netlify** → your site → **Site configuration** → **Build settings**:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18 (or set in UI / `NODE_VERSION` env var)

Or rely on the repo’s `netlify.toml` (already configured).

### 2. Connect repo

- **Site configuration** → **Build & deploy** → **Link repository**
- Choose your Git provider and repo; Netlify will use `netlify.toml` for build/publish and SPA redirects.

### 3. Environment variables (secrets for login + Supabase)

In **Site configuration** → **Environment variables** → **Add variable** (or **Add from .env**):

Add these so they are available at **build time** (Vite bakes `VITE_*` into the frontend):

| Variable | Description | Sensitive |
|----------|-------------|-----------|
| `VITE_LOGIN_USER_1` | Username for user 1 | No |
| `VITE_LOGIN_PASS_1` | Password for user 1 | **Yes** (mark sensitive) |
| `VITE_LOGIN_USER_2` | Username for user 2 | No |
| `VITE_LOGIN_PASS_2` | Password for user 2 | **Yes** |
| `VITE_LOGIN_USER_3` | Username for user 3 | No |
| `VITE_LOGIN_PASS_3` | Password for user 3 | **Yes** |
| `VITE_LOGIN_USER_4` | Username for user 4 | No |
| `VITE_LOGIN_PASS_4` | Password for user 4 | **Yes** |
| `VITE_SUPABASE_URL` | Supabase project URL | No |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | **Yes** |

- You can set only 1–4 users; leave unused pairs unset.
- Mark password and anon key as **sensitive** so they’re hidden in the UI and logs.
- After changing env vars, trigger a **new deploy** so the build picks them up.

### 4. How login works with “secrets”

- Login is **client-side**: the app checks username/password against the 4 `VITE_*` user/pass pairs that were set at **build time**.
- Those values are compiled into the frontend bundle, so they are not secret from anyone who can view the built JS. Use this for **low-risk, demo or personal** use.
- For production-grade auth, you’d use a proper backend or Supabase Auth instead of these env-based credentials.

---

## Supabase (free tier) integration

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, the app uses **Supabase** instead of localStorage for:

- Transactions  
- Budgets  
- Stocks  
- Custom categories  
- Goal settings  

Data is scoped by **username** (the logged-in user). Each of the 4 users has their own data in the same Supabase project.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name, database password, region.
3. Wait for the project to be ready.

### 2. Get URL and anon key

- **Project Settings** → **API**.
- Copy **Project URL** → use as `VITE_SUPABASE_URL`.
- Copy **anon public** key → use as `VITE_SUPABASE_ANON_KEY`.

### 3. Create tables (SQL)

In Supabase: **SQL Editor** → **New query**, paste and run the contents of:

**`supabase/schema.sql`**

That file creates:

- `transactions` (id, user_id, description, amount, type, category, date)
- `budgets` (id, user_id, category, amount, period)
- `stocks` (id, user_id, name, buy_price, quantity, …)
- `custom_categories` (user_id, data JSONB)
- `goal_settings` (user_id, goal_amount)

Plus indexes and RLS policies so the anon key can read/write by `user_id`.

### 4. Use in the app

- **Local:** put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`, then `npm run dev`.
- **Netlify:** add the same two variables in **Environment variables**, then redeploy.

If either variable is missing, the app falls back to **localStorage** (no Supabase).

---

## Mobile responsive

The app is built to work on mobile and tablet:

- Responsive nav (collapsible / icon-only on small screens).
- Grids and cards stack on narrow viewports.
- Tables (e.g. Stocks) scroll horizontally where needed.
- Forms and modals use full width on small screens.
- Touch-friendly controls (e.g. 44px min height where appropriate).

Test on a real device or use browser DevTools device emulation.

---

## Project structure

```
├── src/
│   ├── components/     # Dashboard, Transactions, Budget, GoalSetter, Stocks, Login, etc.
│   ├── services/      # AuthService, DataService, SupabaseService, CurrencyService, AnalyticsService
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── schema.sql     # Tables and RLS for Supabase
├── netlify.toml       # Build and SPA redirect for Netlify
├── .env.example       # Example env vars (copy to .env)
└── package.json
```

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |

---

## License

Use and modify as you like. No warranty.
