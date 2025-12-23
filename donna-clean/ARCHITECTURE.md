# The Donna App - Complete Architecture Documentation

**Version:** 1.0
**Last Updated:** December 23, 2024
**Status:** Production

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Database Schema](#3-database-schema)
4. [Application Architecture](#4-application-architecture)
5. [Data Flow](#5-data-flow)
6. [Authentication & Security](#6-authentication--security)
7. [Business Logic](#7-business-logic)
8. [Recent Major Changes](#8-recent-major-changes)
9. [Known Issues & Technical Debt](#9-known-issues--technical-debt)
10. [Deployment & Environment](#10-deployment--environment)

---

## 1. Project Structure

### Directory Tree

```
donna-clean/
├── app/                          # Next.js 16 App Router
│   ├── (dashboard)/             # Route group for dashboard layouts
│   │   ├── cashpulse/
│   │   └── profit-lens/
│   ├── (legal)/                 # Route group for legal pages
│   ├── admin/                   # Admin panel (protected)
│   ├── alerts/                  # Alerts/notifications page
│   ├── analytics/               # Analytics pages
│   │   ├── cashpulse/
│   │   └── profitlens/
│   ├── api/                     # API routes
│   │   ├── health/             # Health check endpoint
│   │   └── revalidate/         # Cache revalidation
│   ├── auth/                    # Authentication pages
│   │   ├── confirm/            # Email confirmation
│   │   ├── error/
│   │   ├── forgot-password/
│   │   ├── sign-up-success/
│   │   └── update-password/
│   ├── entries/                 # Transaction entries (NEW MODULAR SYSTEM)
│   │   ├── actions.ts          # Server actions for entries
│   │   ├── loading.tsx         # Loading skeleton
│   │   └── page.tsx            # Entries list page
│   ├── home/                    # Home dashboard
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── notifications/
│   ├── parties/                 # Customers/Vendors management
│   ├── profile/
│   ├── protected/              # Protected route example
│   ├── reminders/
│   ├── settings/
│   ├── settlements/            # Settlement actions
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   └── globals.css             # Global styles
│
├── components/                  # React components
│   ├── admin/                  # Admin components
│   ├── alerts/                 # Alert management
│   ├── analytics/              # Analytics dashboards
│   │   ├── cash-pulse-analytics.tsx  # Cash Pulse dashboard
│   │   └── profit-lens-analytics.tsx # Profit Lens dashboard
│   ├── auth/                   # Auth components
│   ├── cashpulse/             # Legacy cashpulse (may be deprecated)
│   ├── common/                # Shared components
│   │   └── period-filter.tsx  # Date range filter
│   ├── dashboard/             # Dashboard widgets
│   ├── empty-states/          # Empty state components
│   ├── entries/               # Entry management components
│   │   ├── entry-details-modal.tsx
│   │   ├── entry-form.tsx
│   │   └── entry-list.tsx     # Transaction history table
│   ├── home/                  # Home page components
│   ├── navigation/            # Navigation components
│   │   ├── bottom-nav.tsx     # Mobile bottom nav
│   │   ├── desktop-nav.tsx    # Desktop sidebar
│   │   └── hamburger-menu.tsx # Mobile menu
│   ├── notifications/
│   ├── profile/
│   └── profit-lens/
│
├── lib/                        # Utility functions & business logic
│   ├── admin/                 # Admin utilities
│   ├── analytics-new.ts       # Cash Pulse calculations (CURRENT)
│   ├── analytics.ts           # Legacy analytics (deprecated)
│   ├── entries.ts             # Entry type definitions & normalization
│   ├── profit-calculations-new.ts  # Profit Lens calculations (CURRENT)
│   ├── supabase/              # Supabase client utilities
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Middleware client
│   ├── action-wrapper.ts      # Server action error handling
│   ├── alert-system.ts        # Alert generation logic
│   ├── calculate-health-score.ts
│   ├── category-mapping.ts
│   ├── date-utils.ts
│   ├── format-number-words.ts
│   ├── parties.ts
│   ├── rate-limit.ts          # Rate limiting
│   ├── sanitization.ts        # Input sanitization
│   ├── toast.ts               # Toast notifications
│   ├── utils.ts               # General utilities
│   └── validation.ts          # Input validation
│
├── supabase/                   # Database & migrations
│   ├── migrations/            # SQL migration files
│   │   ├── 20251202_add_settlement_tracking_columns.sql
│   │   ├── 20251219_fix_advance_settlement_logic.sql  # CRITICAL
│   │   └── ...
│   ├── entries-table.sql      # Entries table schema
│   └── types.ts               # Database types
│
├── types/                      # TypeScript types
│   └── supabase.ts            # Generated Supabase types
│
├── utils/                      # Utility modules
│   └── supabase/              # Supabase utilities
│
├── middleware.ts               # Next.js middleware (auth)
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies

```

### Organization Pattern

**Hybrid Architecture:**
- **Feature-based:** Routes organized by feature (entries, analytics, settlements)
- **Layer-based:** Shared utilities in `lib/`, components in `components/`
- **Colocation:** Route-specific actions and components near their pages

### Key Directory Purposes

- **`app/`**: Next.js 16 App Router pages and layouts
- **`components/`**: Reusable React components (organized by feature)
- **`lib/`**: Business logic, calculations, utilities (framework-agnostic)
- **`supabase/`**: Database schema, migrations, SQL functions
- **`types/`**: TypeScript type definitions

---

## 2. Tech Stack & Dependencies

### Framework & Runtime

- **Next.js**: `^16.0.7` (App Router, Server Components, Server Actions)
- **React**: `^19.2.1`
- **React DOM**: `^19.2.1`
- **TypeScript**: `^5`
- **Node.js**: Target ES2017

### Database & Backend

- **Supabase**: `latest` (@supabase/supabase-js)
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Authentication
- **Supabase SSR**: `^0.7.0` (@supabase/ssr)

### UI Libraries

- **Tailwind CSS**: `^3.4.1`
- **tailwindcss-animate**: `^1.0.7`
- **Radix UI**: Component primitives
  - `@radix-ui/react-dialog`: Modals
  - `@radix-ui/react-dropdown-menu`: Dropdowns
  - `@radix-ui/react-select`: Select inputs
  - `@radix-ui/react-checkbox`: Checkboxes
  - `@radix-ui/react-popover`: Popovers
  - `@radix-ui/react-label`: Form labels
  - `@radix-ui/react-slot`: Composition
  - `@radix-ui/react-collapsible`: Collapsible sections
- **lucide-react**: `^0.511.0` (Icon library)
- **class-variance-authority**: `^0.7.1` (CVA for component variants)
- **clsx**: `^2.1.1` (Conditional classes)
- **tailwind-merge**: `^3.3.0` (Merge Tailwind classes)
- **next-themes**: `^0.4.6` (Dark mode support)

### Data Visualization

- **Recharts**: `^2.12.3` (Charts and graphs)

### State Management

- **TanStack React Query**: `^5.90.12` (@tanstack/react-query)
  - Server state management
  - Caching and invalidation

### Date Handling

- **date-fns**: `^4.1.0`
- **react-day-picker**: `^9.11.2` (Date picker component)

### Monitoring & Analytics

- **Sentry**: `^10.30.0` (@sentry/nextjs)
  - Error tracking
  - Performance monitoring
- **Vercel Analytics**: `^1.6.1`
- **Vercel Speed Insights**: `^1.3.1`

### Notifications & UX

- **Sonner**: `^2.0.7` (Toast notifications)

### Caching (Optional)

- **Vercel KV**: `^3.0.0` (Redis for rate limiting)

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Path Aliases:**
- `@/*` maps to project root (e.g., `@/lib/entries` → `/lib/entries`)

---

## 3. Database Schema

### Tables Overview

#### 1. **entries** (Core Transaction Table)

```sql
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Entry Classification
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'Cash IN', 'Cash OUT', 'Credit', 'Advance',
    'Credit Settlement (Collections)', 'Credit Settlement (Bills)',
    'Advance Settlement (Received)', 'Advance Settlement (Paid)'
  )),
  category TEXT NOT NULL CHECK (category IN ('Sales', 'COGS', 'Opex', 'Assets')),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank', 'None')),

  -- Financial Data
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  remaining_amount NUMERIC(14,2),  -- For Credit/Advance tracking
  settled_amount NUMERIC(14,2),    -- Track settlement amounts

  -- Metadata
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  party_id UUID REFERENCES parties(id),

  -- Settlement Tracking
  settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  is_settlement BOOLEAN DEFAULT false,
  settlement_type TEXT CHECK (settlement_type IN ('credit', 'advance')),
  original_entry_id UUID REFERENCES entries(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

**Key Columns:**
- `entry_type`: Cash IN/OUT, Credit, Advance, or Settlement types
- `category`: Sales, COGS, Opex, Assets
- `payment_method`: Cash, Bank, or None (None = doesn't affect Cash Pulse)
- `remaining_amount`: Tracks unsettled balance for Credit/Advance
- `is_settlement`: Marks settlement entries
- `original_entry_id`: Links settlement to original entry

#### 2. **parties** (Customers & Vendors)

```sql
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('customer', 'vendor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

**Purpose:** Track customers (for Sales) and vendors (for COGS/Opex/Assets)

#### 3. **profiles**

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  logo_url TEXT,
  username TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

**Purpose:** User business profiles

#### 4. **alerts**

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

**Purpose:** System-generated financial alerts

#### 5. **reminders**

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

#### 6. **settlement_history**

```sql
CREATE TABLE settlement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_entry_id UUID NOT NULL REFERENCES entries(id),
  settlement_entry_id UUID NOT NULL REFERENCES entries(id),
  amount_settled NUMERIC(14,2) NOT NULL,
  settlement_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

**Purpose:** Audit trail for settlements

### Database Functions

#### **settle_entry()**

```sql
FUNCTION settle_entry(
  p_entry_id UUID,
  p_user_id UUID,
  p_settlement_amount NUMERIC,
  p_settlement_date DATE
) RETURNS JSON
```

**Purpose:** Atomically settle Credit or Advance entries

**Logic:**
- **Credit settlements**: Create entry with Cash/Bank payment (affects Cash Pulse)
- **Advance settlements**: Create entry with 'None' payment (affects Profit only)
- **Advance Assets**: Just mark as settled (no new entry)

**Returns:** JSON with success status and settlement details

### Row Level Security (RLS)

**All tables have RLS enabled with policies:**

```sql
-- Users can only see their own data
CREATE POLICY "Users can view their own {table}"
  ON {table} FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert their own {table}"
  ON {table} FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "Users can update their own {table}"
  ON {table} FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "Users can delete their own {table}"
  ON {table} FOR DELETE
  USING (auth.uid() = user_id);
```

### Key Indexes

- Primary keys on all `id` columns
- Foreign key indexes on `user_id`, `party_id`, `original_entry_id`
- Index on `entry_date` for date range queries
- Index on `entry_type` for filtering

---

## 4. Application Architecture

### Pages & Routes

#### Public Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing page | Marketing/login |
| `/auth/sign-up-success` | Sign up success | Post-registration message |
| `/auth/error` | Auth error | Error handling |
| `/auth/forgot-password` | Password reset | Request password reset |
| `/auth/update-password` | Update password | Change password |

#### Protected Routes (Require Authentication)

| Route | Page | Purpose | Key Components |
|-------|------|---------|----------------|
| `/home` | Home dashboard | Main dashboard | `<BusinessSnapshot>`, `<ProfitCashDashboard>` |
| `/entries` | Transaction history | List all entries | `<EntryList>`, `<EntryForm>` |
| `/analytics/cashpulse` | Cash Pulse analytics | Cash flow analysis | `<CashPulseAnalytics>` |
| `/analytics/profitlens` | Profit Lens analytics | Profit analysis | `<ProfitLensAnalytics>` |
| `/parties` | Customers/Vendors | Manage parties | Party management |
| `/alerts` | Alerts | Financial alerts | Alert list |
| `/reminders` | Reminders | Task reminders | Reminder management |
| `/profile` | Profile | User profile | Profile editing |
| `/settings` | Settings | App settings | Settings form |
| `/admin` | Admin panel | Admin functions | Admin utilities |

### Core Features

#### **1. Entries System (Modular Design)**

**Location:** `app/entries/`, `components/entries/`, `lib/entries.ts`

**Entry Types:**

1. **Cash IN** (Sales)
   - Immediate cash received
   - Affects: Cash Pulse ✅, Profit Lens ✅
   - Payment method: Cash or Bank

2. **Cash OUT** (COGS/Opex/Assets)
   - Immediate cash paid
   - Affects: Cash Pulse ✅, Profit Lens ✅ (except Assets)
   - Payment method: Cash or Bank

3. **Credit** (Sales/COGS/Opex)
   - Revenue/expense recognized, cash pending
   - Affects: Profit Lens ✅ immediately
   - Affects: Cash Pulse ❌ until settled

4. **Advance** (Sales/COGS/Opex/Assets)
   - Cash paid/received upfront
   - Affects: Cash Pulse ✅ immediately
   - Affects: Profit Lens ❌ until settled

**Entry Categories:**
- **Sales**: Revenue
- **COGS**: Cost of Goods Sold
- **Opex**: Operating Expenses
- **Assets**: Capital expenditures (not expenses)

**Entry Components:**

- **`<EntryForm>`** (`components/entries/entry-form.tsx`)
  - Create/edit entries
  - Dynamic form based on entry type
  - Validation and sanitization

- **`<EntryList>`** (`components/entries/entry-list.tsx`)
  - Transaction history table
  - Filtering and search
  - Action menu (view, edit, delete)
  - Settlement options

- **`<EntryDetailsModal>`** (`components/entries/entry-details-modal.tsx`)
  - View entry details
  - Settlement history

**Server Actions:** `app/entries/actions.ts`
- `getEntries()`: Fetch entries with parties
- `createEntry()`: Create new entry
- `updateEntry()`: Update existing entry
- `deleteEntry()`: Delete entry

#### **2. Settlement System**

**Location:** `app/settlements/`, `supabase/migrations/20251219_fix_advance_settlement_logic.sql`

**How Settlements Work:**

**Credit Settlement:**
```
Original: Credit Sales ₹10,000 (payment_method=None)
Settlement: Credit Settlement (Collections) ₹10,000 (payment_method=Cash)
Result:
  - Cash Pulse: +₹10,000 (cash received)
  - Profit Lens: No change (already recognized)
```

**Advance Settlement:**
```
Original: Advance Sales ₹5,000 (payment_method=Cash)
Settlement: Advance Settlement (Received) ₹5,000 (payment_method=None)
Result:
  - Cash Pulse: No change (cash already counted)
  - Profit Lens: +₹5,000 (revenue recognized)
```

**Database Function:** `settle_entry()`
- Validates settlement amount
- Creates settlement entry
- Updates original entry remaining_amount
- Marks as settled when fully settled
- Records in settlement_history

**UI Flow:**
1. User clicks "Settle" on entry
2. Settlement modal opens
3. User enters amount and date
4. Calls `settle_entry()` function
5. Updates both entries
6. Refreshes UI

#### **3. Analytics Dashboards**

##### **Cash Pulse Analytics**

**Location:** `components/analytics/cash-pulse-analytics.tsx`

**Purpose:** Cash-basis accounting (actual cash movements)

**Calculations:** `lib/analytics-new.ts`

**Key Metrics:**
- **Total Cash Balance**: All-time cash in - cash out
- **Cash IN**: Cash Inflow + Advance Sales + Credit Collections
- **Cash OUT**: Cash Outflow + Advance Expenses + Credit Bills
- **What's left!**: Period-based change (Cash IN - Cash OUT for selected period)
- **Cash Flow Trend**: Daily cash movements
- **Category Breakdown**: Cash by category

**Recent UI Changes (Dec 2024):**
- New "What's left!" primary hero card
- Dynamic period labels
- Color-coded positive/negative states
- Breakdown text showing previous + current period

##### **Profit Lens Analytics**

**Location:** `components/analytics/profit-lens-analytics.tsx`

**Purpose:** Accrual-basis accounting (revenue/expenses when earned/incurred)

**Calculations:** `lib/profit-calculations-new.ts`

**Key Metrics:**
- **Revenue**: Cash IN Sales + ALL Credit Sales + Advance Settlements (Received)
- **COGS**: Cash OUT COGS + Credit COGS + Advance Settlements (Paid, COGS)
- **Gross Profit**: Revenue - COGS
- **Operating Expenses**: Cash OUT Opex + Credit Opex + Advance Settlements (Paid, Opex)
- **Net Profit**: Gross Profit - Operating Expenses
- **Profit Margin**: (Net Profit / Revenue) × 100

**Features:**
- Profit trend (6 months)
- Expense breakdown (COGS vs Opex)
- Top 5 expenses table
- AI-generated recommendations

#### **4. Parties System**

**Location:** `app/parties/`, `components/parties/`

**Types:**
- **Customers**: For Sales transactions
- **Vendors**: For COGS/Opex/Assets transactions

**Integration:**
- Entries can be linked to parties via `party_id`
- Displayed in transaction history
- Used in top expenses table

### Shared Components

#### Navigation

- **`<BottomNav>`** (`components/navigation/bottom-nav.tsx`)
  - Mobile bottom navigation bar
  - Icons with labels
  - Active state highlighting
  - Prefetch enabled

- **`<DesktopNav>`** (`components/navigation/desktop-nav.tsx`)
  - Desktop sidebar navigation
  - Collapsible sections
  - User profile display

- **`<HamburgerMenu>`** (`components/navigation/hamburger-menu.tsx`)
  - Mobile menu overlay
  - Settings and admin links

#### Common

- **`<PeriodFilter>`** (`components/common/period-filter.tsx`)
  - Date range selector
  - Presets: This Month, Last Month, This Year, Last Year, All Time
  - Custom date range picker
  - Used in both analytics dashboards

#### Empty States

- **`<NoEntries>`** - Empty state for transaction list
- **`<NoAlerts>`** - Empty state for alerts
- **`<NoData>`** - Generic empty state

### Utility Functions

#### `lib/entries.ts`

**Purpose:** Entry type definitions and normalization

**Key Exports:**
```typescript
export const ENTRY_TYPES = ["Cash IN", "Cash OUT", "Credit", "Advance"]
export const SETTLEMENT_TYPES = [
  "Credit Settlement (Collections)",
  "Credit Settlement (Bills)",
  "Advance Settlement (Received)",
  "Advance Settlement (Paid)"
]
export const CATEGORIES = ["Sales", "COGS", "Opex", "Assets"]
export const PAYMENT_METHODS = ["Cash", "Bank", "None"]

export type Entry = {
  id: string
  entry_type: AllEntryTypes
  category: CategoryType
  payment_method: PaymentMethod
  amount: number
  remaining_amount: number
  settled_amount: number | null
  entry_date: string
  party_id: string | null
  party?: { name: string } | null
  is_settlement?: boolean
  settlement_type?: string | null
  original_entry_id?: string | null
  // ...
}

export function normalizeEntry(entry: SupabaseEntry): Entry
```

#### `lib/analytics-new.ts`

**Purpose:** Cash Pulse calculations (cash-basis accounting)

**Key Functions:**
```typescript
calculateCashBalance(entries: Entry[]): number
getTotalCashIn(entries: Entry[], startDate?: Date, endDate?: Date): number
getTotalCashOut(entries: Entry[], startDate?: Date, endDate?: Date): number
getCashInByCategory(entries: Entry[], startDate?: Date, endDate?: Date): CategoryBreakdown[]
getCashOutByCategory(entries: Entry[], startDate?: Date, endDate?: Date): CategoryBreakdown[]
getCashFlowTrend(entries: Entry[], days: number = 30): CashFlowData[]
getMonthlyComparison(entries: Entry[]): MonthlyComparison
```

**Logic:**
- Includes: Cash IN/OUT, Advance (all categories), Credit Settlements
- Excludes: Credit (original), Advance Settlements (cash already counted)

#### `lib/profit-calculations-new.ts`

**Purpose:** Profit Lens calculations (accrual-basis accounting)

**Key Functions:**
```typescript
calculateRevenue(entries: Entry[], startDate?: Date, endDate?: Date): number
calculateCOGS(entries: Entry[], startDate?: Date, endDate?: Date): number
calculateGrossProfit(revenue: number, cogs: number): number
calculateOperatingExpenses(entries: Entry[], startDate?: Date, endDate?: Date): number
calculateNetProfit(grossProfit: number, operatingExpenses: number): number
calculateProfitMargin(netProfit: number, revenue: number): number
getProfitMetrics(entries: Entry[], startDate?: Date, endDate?: Date): ProfitMetrics
getProfitTrend(entries: Entry[], months: number = 6): ProfitTrendData[]
getExpenseBreakdown(entries: Entry[], startDate?: Date, endDate?: Date): CategoryExpense[]
getRecommendations(entries: Entry[], startDate?: Date, endDate?: Date): string[]
```

**Logic:**
- Revenue: Cash IN Sales + ALL Credit Sales + Advance Settlements (Received)
- COGS: Cash OUT COGS + Credit COGS + Advance Settlements (Paid, COGS)
- Opex: Cash OUT Opex + Credit Opex + Advance Settlements (Paid, Opex)
- Excludes: Original Advances (not yet earned/incurred), Assets (not expenses)

#### Other Utilities

- **`lib/validation.ts`**: Input validation schemas
- **`lib/sanitization.ts`**: XSS and injection prevention
- **`lib/rate-limit.ts`**: Rate limiting with Vercel KV
- **`lib/action-wrapper.ts`**: Error handling wrapper for server actions
- **`lib/alert-system.ts`**: Auto-generate financial alerts
- **`lib/date-utils.ts`**: Date manipulation helpers
- **`lib/format-number-words.ts`**: Number to words conversion

---

## 5. Data Flow

### User Action → Database → UI Flow

#### Example: Creating a New Entry

```
┌─────────────┐
│   User      │
│  fills form │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  <EntryForm>        │ (Client Component)
│  - Validates input  │
│  - Calls action     │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────┐
│  createEntry()           │ (Server Action)
│  app/entries/actions.ts  │
│  - Rate limit check      │
│  - Sanitize input        │
│  - Validate schema       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Supabase                │
│  - RLS check             │
│  - Insert into entries   │
│  - Auto-generate alerts  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  revalidatePath()        │
│  - Clear Next.js cache   │
│  - Trigger re-fetch      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  UI Updates              │
│  - Entry appears in list │
│  - Analytics refresh     │
└──────────────────────────┘
```

### Server Actions vs Client-Side

**Server Actions (Preferred):**
- All data mutations (create, update, delete)
- File: `app/{feature}/actions.ts`
- Benefits: Type-safe, no API routes needed, automatic revalidation

**Client-Side Operations:**
- UI state (modals, filters, sorting)
- Local calculations (useMemo for performance)
- Supabase client for real-time subscriptions (if implemented)

### Caching Strategy

**Next.js 16 Caching:**
- Server Components: Cached by default
- `revalidatePath()`: Invalidate specific routes after mutations
- `revalidateTag()`: Invalidate tagged data

**React Query (TanStack):**
- Used for client-side state management
- Automatic background refetching
- Optimistic updates

**No Real-time Subscriptions (Currently):**
- Data fetched on page load
- Manually refreshed after mutations
- Future: Could add Supabase real-time for multi-user scenarios

---

## 6. Authentication & Security

### Supabase Auth

**Configuration:** `lib/supabase/`

**Client Types:**
1. **Browser Client** (`lib/supabase/client.ts`)
   - Used in Client Components
   - Created per component with `useMemo`
   - Handles session refresh automatically

2. **Server Client** (`utils/supabase/server.ts`)
   - Used in Server Components and Server Actions
   - Reads session from cookies
   - Creates new instance per request

3. **Middleware Client** (`utils/supabase/middleware.ts`)
   - Used in `middleware.ts`
   - Refreshes session on every request

### Session Management

**Middleware** (`middleware.ts`):
```typescript
// Runs on every request
export async function middleware(request: NextRequest) {
  // Refresh session
  const { response } = await updateSession(request)

  // Protected routes check
  if (isProtectedRoute && !user) {
    return NextResponse.redirect('/auth/login')
  }

  return response
}
```

**Session Keeper** (`components/auth-session-keeper.tsx`):
- Client-side session refresh
- Prevents session expiration during use

### Protected Routes

**Pattern:**
- Public: `/`, `/auth/*`
- Protected: `/home`, `/entries`, `/analytics/*`, etc.

**Implementation:**
- Middleware checks authentication
- Redirects to login if not authenticated

### Row Level Security (RLS)

**All tables enforce:**
```sql
auth.uid() = user_id
```

**Benefits:**
- Users can only access their own data
- Enforced at database level (not application)
- Protection against SQL injection and authorization bypasses

### Security Headers

**Next.js Config** (`next.config.ts`):
```typescript
headers: [
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
]
```

### Input Sanitization

**Location:** `lib/sanitization.ts`

**Functions:**
- `sanitizeString()`: XSS prevention
- `sanitizeAmount()`: Number validation
- `sanitizeDate()`: Date validation
- `sanitizeEmail()`: Email validation

**Usage:** All server actions sanitize inputs before database operations

### Rate Limiting

**Location:** `lib/rate-limit.ts`

**Implementation:**
- Uses Vercel KV (Redis)
- Limits: 10 requests per 10 seconds per user
- Applied to all mutations

---

## 7. Business Logic

### Entry Type Rules

#### **Cash IN (Sales)**

**When to use:** Immediate cash received for sales

**Impact:**
- Cash Pulse: ✅ Increases immediately
- Profit Lens: ✅ Revenue recognized immediately
- Payment method: Cash or Bank

**Example:** Customer pays ₹5,000 cash for product

#### **Cash OUT (COGS/Opex/Assets)**

**When to use:** Immediate cash paid for expenses/purchases

**Impact:**
- Cash Pulse: ✅ Decreases immediately
- Profit Lens: ✅ Expense recognized immediately (except Assets)
- Payment method: Cash or Bank

**Example:** Pay ₹2,000 cash for supplies (COGS)

#### **Credit (Sales/COGS/Opex)**

**When to use:** Revenue earned or expense incurred, payment pending

**Impact on Creation:**
- Cash Pulse: ❌ No impact (no cash movement yet)
- Profit Lens: ✅ Revenue/expense recognized immediately
- Payment method: None

**Impact on Settlement:**
- Cash Pulse: ✅ Cash movement recorded
- Profit Lens: ❌ No change (already recognized)
- Creates: Credit Settlement entry with Cash/Bank payment

**Example:**
- Create: Invoice customer ₹10,000 (Credit Sales)
- Settle: Customer pays ₹10,000 → Credit Settlement (Collections)

#### **Advance (Sales/COGS/Opex/Assets)**

**When to use:** Cash paid/received before work completed

**Impact on Creation:**
- Cash Pulse: ✅ Cash movement recorded immediately
- Profit Lens: ❌ No impact (revenue/expense not yet earned/incurred)
- Payment method: Cash or Bank

**Impact on Settlement:**
- Cash Pulse: ❌ No change (cash already counted)
- Profit Lens: ✅ Revenue/expense recognized
- Creates: Advance Settlement entry with 'None' payment

**Special Case - Assets:**
- Settlement: Just marks as settled, no new entry (assets don't affect profit)

**Example:**
- Create: Customer pays ₹5,000 advance (Advance Sales, payment_method=Cash)
- Settle: Work completed → Advance Settlement (Received, payment_method=None)

### Financial Calculations

#### **Cash Pulse (Cash-Basis Accounting)**

**Formula:**
```
Cash Balance = Cash IN - Cash OUT

Cash IN =
  Cash IN entries (payment_method=Cash/Bank)
  + Advance Sales (payment_method=Cash/Bank)
  + Credit Settlement (Collections) (payment_method=Cash/Bank)

Cash OUT =
  Cash OUT entries (payment_method=Cash/Bank)
  + Advance COGS/Opex/Assets (payment_method=Cash/Bank)
  + Credit Settlement (Bills) (payment_method=Cash/Bank)
```

**Excludes:**
- Original Credit entries (payment_method=None)
- Advance Settlements (payment_method=None)

**Period Change ("What's left!"):**
```
Period Change = Cash IN (period) - Cash OUT (period)
```

**Previous Balance:**
```
Previous Balance = Total Cash Balance - Period Change
```

#### **Profit Lens (Accrual-Basis Accounting)**

**Revenue Formula:**
```
Revenue =
  Cash IN Sales (excluding Credit Settlements)
  + ALL Credit Sales (both settled and unsettled)
  + Advance Settlement (Received)

Excludes: Original Advance Sales
```

**COGS Formula:**
```
COGS =
  Cash OUT COGS (excluding Credit Settlements)
  + ALL Credit COGS
  + Advance Settlement (Paid) for COGS

Excludes: Original Advance COGS
```

**Operating Expenses Formula:**
```
OpEx =
  Cash OUT Opex (excluding Credit Settlements)
  + ALL Credit Opex
  + Advance Settlement (Paid) for Opex

Excludes: Original Advance Opex, Assets
```

**Profit Formulas:**
```
Gross Profit = Revenue - COGS
Net Profit = Gross Profit - Operating Expenses
Profit Margin = (Net Profit / Revenue) × 100
```

### Settlement Impact on Calculations

#### Credit Settlement Example

```
Day 1: Create Credit Sales ₹10,000
  Cash Pulse: ₹0 (no cash yet)
  Profit Lens: +₹10,000 (revenue recognized)

Day 5: Settle Credit ₹10,000
  Cash Pulse: +₹10,000 (cash received)
  Profit Lens: ₹0 (no change, already counted)
```

#### Advance Settlement Example

```
Day 1: Create Advance Sales ₹5,000
  Cash Pulse: +₹5,000 (cash received)
  Profit Lens: ₹0 (revenue not earned yet)

Day 10: Settle Advance ₹5,000
  Cash Pulse: ₹0 (no change, already counted)
  Profit Lens: +₹5,000 (revenue recognized)
```

### Period Filtering Logic

**Cash Pulse:**
- Period filter affects: Cash IN/OUT calculations for selected period
- Does NOT affect: Total cash balance (always all-time)
- "What's left!" card: Shows period change only

**Profit Lens:**
- Period filter affects: ALL metrics (revenue, COGS, opex, profit)
- Shows profit performance for selected period only

---

## 8. Recent Major Changes

### 1. Migration from Daily Entries to Modular Entries System

**Date:** November-December 2024

**Changes:**
- **Old:** `daily_entries` table with daily summaries
- **New:** `entries` table with individual transactions
- Removed: `/daily-entries` routes
- Added: `/entries` route with full CRUD operations

**Benefits:**
- Granular transaction tracking
- Better audit trail
- Support for settlements
- Accurate analytics

### 2. Settlement System Implementation

**Date:** December 2024

**Migrations:**
- `20251202_add_settlement_tracking_columns.sql`
- `20251219_fix_advance_settlement_logic.sql` (CRITICAL)

**Changes:**
- Added settlement tracking columns to entries table
- Created `settle_entry()` database function
- Added `settlement_history` table
- Implemented settlement UI

**Bug Fix (Dec 19):**
- **Problem:** Advance settlements were double-counting cash
- **Solution:** Use `payment_method='None'` for Advance settlements
- **Impact:** Advance settlements now only affect Profit Lens, not Cash Pulse

### 3. Settlement UI Redesign

**Date:** December 2024

**Changes:**
- New settlement modal design
- Clear visual distinction for Credit vs Advance settlements
- Settlement history tracking
- Improved UX for partial settlements

### 4. Cashpulse UI Refactoring

**Date:** December 23, 2024

**Changes:**
- **New Layout:** Cash IN/OUT → "What's left!" → Total balance → Balances
- **New Primary Card:** "What's left!" with period-dependent calculation
- **Dynamic Period Labels:** "This Month", "Last Month", etc.
- **Breakdown Text:** Shows previous balance + current period change
- **Removed:** Trend indicators from Cash IN/OUT cards
- **Color Coding:** Green for positive, red for negative

**Files Changed:**
- `components/analytics/cash-pulse-analytics.tsx`

### 5. Performance Optimization - Phase 1

**Date:** December 20, 2024

**Changes:**
1. **Loading States:**
   - Added `loading.tsx` for `/home` and `/entries` routes
   - Instant skeleton display during navigation

2. **Console Log Removal:**
   - Removed 15+ verbose console.log statements from `app/entries/actions.ts`
   - Kept only critical error logging

3. **Prefetch Enabled:**
   - Added `prefetch={true}` to all `<Link>` components in navigation
   - Mobile bottom nav, desktop nav, hamburger menu

4. **Query Limiting:**
   - Added `.limit(100)` to main entries query
   - Prevents performance degradation with large datasets

**Expected Impact:**
- Before: 2-4 seconds blank screen
- After: <300ms skeleton, <1s full render

### 6. Mobile Dropdown Menu Fix

**Date:** December 18-20, 2024

**Changes:**
- **Problem:** Three-dot action menu not appearing or appearing too far from button
- **Fix 1:** Changed from `right`-based to `left`-based positioning
- **Fix 2:** Centered menu vertically on button instead of below/above
- **Implementation:** Fixed positioning with viewport boundary checks

**Files Changed:**
- `components/entries/entry-list.tsx`

### 7. Top 5 Expenses Feature

**Date:** December 18, 2024

**Changes:**
- Added "Top 5 Expenses" table to Profit Lens
- Displays: Date, Type (color-coded badges), Amount, Vendor
- Filters by selected period
- Excludes settlement collections

**Files Changed:**
- `components/analytics/profit-lens-analytics.tsx`

### 8. TypeScript Strict Mode Migration

**Date:** Ongoing

**Changes:**
- Gradual migration to strict TypeScript
- Fixed type errors in Entry normalization
- Proper handling of settlement types in type system

---

## 9. Known Issues & Technical Debt

### Known Issues

1. **No Real-time Updates**
   - Data only refreshes on page load or manual refresh
   - Multi-user scenarios not handled
   - **Future:** Implement Supabase real-time subscriptions

2. **Limited Query Performance at Scale**
   - Current limit: 100 entries per query
   - May need pagination for users with >100 entries
   - **Future:** Implement cursor-based pagination

3. **No Image Upload**
   - `image_url` field exists but not implemented in UI
   - **Future:** Add image upload for receipts

4. **Alert System Not Fully Utilized**
   - Alerts generated but UI is basic
   - **Future:** Rich alert cards with actions

### Technical Debt

1. **Legacy Analytics Files**
   - `lib/analytics.ts` - deprecated, use `lib/analytics-new.ts`
   - Should be removed after confirming no dependencies

2. **Mixed Entry Type Handling**
   - Some components use string literals instead of typed constants
   - **Refactor:** Standardize to use `ENTRY_TYPES` from `lib/entries.ts`

3. **Inconsistent Error Handling**
   - Some server actions return `{ error: string }`
   - Others throw errors
   - **Standardize:** Use consistent error return type

4. **No Automated Tests**
   - No unit tests for calculations
   - No integration tests for critical flows
   - **Future:** Add Jest + React Testing Library

5. **Hardcoded Currency**
   - Assumes Indian Rupees (₹)
   - **Future:** Add currency selection to profile

6. **Settlement UX Could Improve**
   - No bulk settlement option
   - No automated settlement matching
   - **Future:** Smart settlement suggestions

### Security Considerations

1. **Rate Limiting Bypass**
   - Rate limit only applies to authenticated users
   - Unauthenticated endpoints not rate-limited
   - **Future:** Add rate limiting to auth endpoints

2. **No Audit Logs**
   - No tracking of who changed what
   - **Future:** Add audit trail table

3. **Session Timeout Not Configurable**
   - Uses Supabase defaults
   - **Future:** Allow custom session duration

---

## 10. Deployment & Environment

### Deployment Platform

**Vercel:**
- Automatic deployments from Git
- Edge functions for middleware
- Serverless functions for API routes
- Global CDN

### Environment Variables

**Required:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Sentry (Production)
SENTRY_ORG=your-org
SENTRY_PROJECT=donna-app
SENTRY_AUTH_TOKEN=your-auth-token

# Vercel KV (Optional, for rate limiting)
KV_URL=your-kv-url
KV_REST_API_URL=your-kv-rest-url
KV_REST_API_TOKEN=your-kv-token
KV_REST_API_READ_ONLY_TOKEN=your-kv-readonly-token
```

**Local Development:**
- Create `.env.local` file (gitignored)
- Copy from `.env.example`

### Build Process

**Commands:**
```bash
npm run dev        # Development server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
```

**Build Output:**
- Static assets: `.next/static/`
- Server functions: `.next/server/`
- Build size: ~3-4 MB (optimized)

### CI/CD Pipeline

**Current:**
- Git push → Vercel auto-deploy
- Preview deployments for PRs
- Production deployment on main branch

**Future:**
- Add automated tests before deployment
- Database migration checks
- Lighthouse performance checks

### Monitoring

**Sentry:**
- Error tracking
- Performance monitoring
- User feedback
- Source maps uploaded on production builds

**Vercel Analytics:**
- Page views
- Geographic distribution
- Device breakdown

**Vercel Speed Insights:**
- Core Web Vitals
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)

### Database Backups

**Supabase:**
- Automatic daily backups (retained 7 days)
- Point-in-time recovery available
- Manual backups via dashboard

---

## Appendix

### Key File Reference

**Most Important Files:**

1. **Business Logic:**
   - `lib/analytics-new.ts` - Cash Pulse calculations
   - `lib/profit-calculations-new.ts` - Profit Lens calculations
   - `lib/entries.ts` - Entry type system

2. **Database:**
   - `supabase/migrations/20251219_fix_advance_settlement_logic.sql` - Settlement logic
   - `types/supabase.ts` - Database types

3. **UI Components:**
   - `components/analytics/cash-pulse-analytics.tsx` - Cash Pulse dashboard
   - `components/analytics/profit-lens-analytics.tsx` - Profit Lens dashboard
   - `components/entries/entry-list.tsx` - Transaction history

4. **Server Actions:**
   - `app/entries/actions.ts` - Entry CRUD operations

### Glossary

- **Cash Pulse**: Cash-basis accounting view (actual cash movements)
- **Profit Lens**: Accrual-basis accounting view (revenue/expenses when earned/incurred)
- **Entry**: Individual financial transaction
- **Settlement**: Converting Credit/Advance to cash (Credit) or revenue/expense (Advance)
- **RLS**: Row Level Security (database-level access control)
- **Party**: Customer or Vendor

### Contact & Support

- **Repository**: [GitHub URL]
- **Issues**: Report bugs via GitHub Issues
- **Documentation**: This file + inline code comments

---

**End of Architecture Documentation**
