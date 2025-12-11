# Home Page Enhancement - Implementation Plan

## Pre-flight Check Results ✅

### Current Structure

**Target Page**: `app/home/page.tsx` ⭐
**Current State**: Already has BusinessSnapshot + entries data

**Other Pages (NOT touching these):**
- `app/page.tsx` - Public landing page (marketing)
- `app/dashboard/page.tsx` - Basic dashboard (minimal)

### Data Already Available
✅ **Entries**: Fetched via `getEntries()` from daily-entries
✅ **User**: Available via `getOrRefreshUser()`
✅ **Entry Type**: Defined in `lib/entries.ts` and `app/entries/actions.ts`

### Dependencies Status
✅ **Select component**: EXISTS (`components/ui/select.tsx`)
✅ **PeriodFilter**: EXISTS (already used in BusinessSnapshot)
✅ **Alert types**: EXISTS (`components/home/alerts-section.tsx`)

### Existing Components (Can Reuse)
✅ `components/dashboard/business-snapshot.tsx` - **Client component, takes entries**
✅ `components/home/alerts-section.tsx` - **Client component, shows alerts**
✅ `components/common/period-filter.tsx` - **Period dropdown component**

### Type Definitions Found
✅ **Entry type**: `lib/entries.ts` and `app/entries/actions.ts`
✅ **Alert type**: Defined in `alerts-section.tsx`:
```typescript
interface Alert {
  id: string
  user_id: string
  type: 'critical' | 'warning' | 'info'
  priority: number
  title: string
  message: string
  is_read: boolean
  created_at: string
}
```

---

## Current Home Page Layout

```tsx
app/home/page.tsx
├── Auth check
├── Fetch entries
└── Render:
    ├── <SiteHeader />
    ├── <TopNavMobile />
    ├── <section> (main content)
    │   └── <BusinessSnapshot entries={entries} />
    └── <BottomNav />
```

---

## Proposed Enhancement

### Goal
Add smart business insights ABOVE BusinessSnapshot:
1. Personalized greeting (Good morning/afternoon/evening)
2. Quick insights section showing:
   - Upcoming due dates
   - Low cash warnings
   - Unsettled transactions
   - Recent large expenses

---

## Implementation Plan

### Change 1: Add Greeting Component
**File to create**: `components/home/greeting-section.tsx`

**Purpose**: Show personalized time-based greeting

**Code**:
```typescript
'use client'

import { useState, useEffect } from 'react'

interface GreetingSectionProps {
  businessName: string | null
}

export function GreetingSection({ businessName }: GreetingSectionProps) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{greeting}</h1>
      {businessName && (
        <p className="text-muted-foreground">{businessName}</p>
      )}
    </div>
  )
}
```

**Dependencies**: None
**Risk**: **LOW** (new component, no modifications)
**Time**: 5 minutes

---

### Change 2: Add Business Insights Component
**File to create**: `components/home/business-insights.tsx`

**Purpose**: Show 3-6 smart insights based on entries data

**Insights to show (priority order)**:
1. **Critical** - Cash below threshold
2. **Warning** - Upcoming collections due (next 7 days)
3. **Warning** - Unsettled credit transactions > 30 days
4. **Info** - Large expense this week (> average)
5. **Info** - Positive cash trend
6. **Info** - Recent settlements

**Code structure**:
```typescript
'use client'

import { useMemo } from 'react'
import { type Entry } from '@/lib/entries'
import { AlertTriangle, TrendingUp, Clock, DollarSign } from 'lucide-react'

interface BusinessInsightsProps {
  entries: Entry[]
}

export function BusinessInsights({ entries }: BusinessInsightsProps) {
  const insights = useMemo(() => {
    // Calculate insights from entries
    // Return array of max 6 insights
  }, [entries])

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {insights.map(insight => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  )
}
```

**Dependencies**: Entry type from `lib/entries.ts`
**Risk**: **LOW** (new component, reads existing data)
**Time**: 25 minutes

---

### Change 3: Fetch User Profile in HomePage
**File to modify**: `app/home/page.tsx`

**Current**: Only fetches user (for auth)
**Change**: Also fetch profile for business name

**Code**:
```typescript
// Add after user fetch
const { data: profile } = await supabase
  .from('profiles')
  .select('business_name')
  .eq('user_id', user.id)
  .single()

// Pass to components
<GreetingSection businessName={profile?.business_name} />
```

**Dependencies**: None (Supabase already imported)
**Risk**: **LOW** (optional data, doesn't break if missing)
**Time**: 5 minutes

---

### Change 4: Fetch Alerts for Insights
**File to modify**: `app/home/page.tsx`

**Purpose**: Get alerts to show in insights
**Note**: Alerts table already exists (used in alerts-section.tsx)

**Code**:
```typescript
// Fetch alerts
const { data: alerts } = await supabase
  .from('alerts')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_read', false)
  .order('priority', { ascending: false })
  .limit(6)

// Pass to insights
<BusinessInsights entries={entries} alerts={alerts || []} />
```

**Dependencies**: None
**Risk**: **LOW** (optional data)
**Time**: 5 minutes

---

### Change 5: Update HomePage Layout
**File to modify**: `app/home/page.tsx`

**Current layout**:
```tsx
<section>
  <BusinessSnapshot entries={entries} />
</section>
```

**New layout**:
```tsx
<section className="flex-1 px-4 py-4 md:px-8 overflow-auto">
  <div className="mx-auto w-full max-w-6xl space-y-6">
    {/* NEW: Greeting */}
    <GreetingSection businessName={profile?.business_name} />

    {/* NEW: Smart Insights */}
    <BusinessInsights entries={entries} alerts={alerts || []} />

    {/* EXISTING: Business Snapshot */}
    <Suspense fallback={<EntryListSkeleton />}>
      <BusinessSnapshot entries={entries} />
    </Suspense>
  </div>
</section>
```

**Dependencies**: New components created above
**Risk**: **LOW** (just adding, not removing)
**Time**: 5 minutes

---

## Implementation Order

### Phase 1: Setup (10 min)
1. Create `greeting-section.tsx`
2. Test greeting renders
3. Commit: "feat: add greeting section to home page"

### Phase 2: Insights Component (25 min)
1. Create `business-insights.tsx`
2. Implement insight calculations
3. Test with sample data
4. Commit: "feat: add business insights component"

### Phase 3: Data Fetching (10 min)
1. Modify `app/home/page.tsx` to fetch profile
2. Modify `app/home/page.tsx` to fetch alerts
3. Test data flows correctly
4. Commit: "feat: fetch profile and alerts for home page"

### Phase 4: Integration (10 min)
1. Add greeting to home page
2. Add insights to home page
3. Test full page layout
4. Commit: "feat: integrate greeting and insights into home page"

### Phase 5: Polish & Test (10 min)
1. Add loading states
2. Add empty states
3. Test responsive layout
4. Final build test
5. Commit: "polish: improve home page UX"

**Total Time: ~65 minutes**

---

## Success Criteria

### Functionality
- ✅ Greeting shows correct time-based message
- ✅ Insights show max 6 relevant items
- ✅ Priority ordering works (critical → warning → info)
- ✅ Insights are actionable (link to relevant pages)
- ✅ All existing features still work

### Technical
- ✅ No TypeScript errors
- ✅ Build passes (`npm run build`)
- ✅ No console errors
- ✅ All data fetching succeeds (or gracefully fails)

### UX
- ✅ Responsive on mobile, tablet, desktop
- ✅ Loading states look good
- ✅ Empty states handled gracefully
- ✅ Smooth layout (no layout shift)

---

## Rollback Plan

Each phase = separate commit:
- Phase 1 fails → Rollback 1 commit
- Phase 2 fails → Rollback 2 commits
- Phase 3 fails → Rollback 3 commits
- Phase 4 fails → Rollback 4 commits

**Minimal risk** - all changes are additive, not modifying existing components.

---

## Potential Issues & Solutions

### Issue 1: Profile doesn't exist for user
**Solution**: Greeting falls back to generic "Good morning" without business name
**Code**: `{businessName && <p>{businessName}</p>}`

### Issue 2: No alerts in database
**Solution**: Insights component shows entry-based insights only
**Code**: `{alerts.length > 0 && <AlertInsights />}`

### Issue 3: Entries array is empty
**Solution**: Show empty state with helpful message
**Code**: `{entries.length === 0 ? <EmptyState /> : <Insights />}`

### Issue 4: Layout shift during load
**Solution**: Add skeleton loaders for greeting and insights
**Code**: `<Suspense fallback={<InsightsSkeleton />}>`

---

## What We're NOT Changing

❌ **NOT touching** `app/page.tsx` (public landing)
❌ **NOT touching** `app/dashboard/page.tsx` (basic dashboard)
❌ **NOT modifying** BusinessSnapshot component
❌ **NOT modifying** existing alerts system
❌ **NOT adding new database tables**
❌ **NOT changing navigation**

---

## Summary

**What**: Add smart greeting + business insights to home page
**Where**: `app/home/page.tsx` + 2 new components
**Data**: Uses existing entries + alerts (already in DB)
**Risk**: **LOW** (all additive changes)
**Time**: ~65 minutes
**Commits**: 5 incremental commits for easy rollback

**This follows the EXACT same safe pattern we used for settlements!**
