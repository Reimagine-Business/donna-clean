# PROFIT LENS DEBUG REPORT
**Generated:** 2025-11-29
**Purpose:** Diagnose why Credit and Advance entries are not appearing correctly in Profit Lens

---

## 1. CURRENT CALCULATION LOGIC

### calculateRevenue() - COMPLETE CODE

```typescript
// File: lib/profit-calculations-new.ts (Lines 45-88)
export function calculateRevenue(entries: Entry[], startDate?: Date, endDate?: Date): number {
  console.log('🔍 [REVENUE] Total entries received:', entries.length)

  // Log all Sales entries to debug
  const allSalesEntries = entries.filter(e => e.category === 'Sales')
  console.log('🔍 [REVENUE] Sales entries found:', allSalesEntries.length)
  console.log('🔍 [REVENUE] Sales breakdown:', allSalesEntries.map(e => ({
    id: e.id,
    type: e.entry_type,
    amount: e.amount,
    settled: e.settled,
    notes: e.notes,
    date: e.entry_date
  })))

  let filtered = entries.filter(e =>
    e.category === 'Sales' &&
    (
      // Cash IN ONLY if NOT a Credit settlement (prevents double-counting)
      (e.entry_type === 'Cash IN' && !e.notes?.startsWith('Settlement of Credit')) ||
      e.entry_type === 'Credit' ||
      (e.entry_type === 'Advance' && e.settled === true)  // ✅ Include settled Advance
    )
  )

  console.log('🔍 [REVENUE] Filtered Sales entries (for P&L):', filtered.length, filtered.map(e => ({
    type: e.entry_type,
    amount: e.amount,
    settled: e.settled
  })))

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  console.log('🔍 [REVENUE] Total revenue calculated:', total)

  return total
}
```

**FILTER LOGIC:**
- ✅ Include: `entry_type === 'Cash IN'` AND `category === 'Sales'` AND `notes` does NOT start with "Settlement of Credit"
- ✅ Include: `entry_type === 'Credit'` AND `category === 'Sales'`
- ✅ Include: `entry_type === 'Advance'` AND `category === 'Sales'` AND `settled === true`
- ❌ Exclude: Cash IN entries with notes starting with "Settlement of Credit"

---

### calculateCOGS() - COMPLETE CODE

```typescript
// File: lib/profit-calculations-new.ts (Lines 90-126)
export function calculateCOGS(entries: Entry[], startDate?: Date, endDate?: Date): number {
  console.log('🔍 [COGS] Total entries received:', entries.length)

  const allCOGSEntries = entries.filter(e => e.category === 'COGS')
  console.log('🔍 [COGS] COGS entries found:', allCOGSEntries.length)
  console.log('🔍 [COGS] COGS breakdown:', allCOGSEntries.map(e => ({
    type: e.entry_type,
    amount: e.amount,
    settled: e.settled,
    notes: e.notes
  })))

  let filtered = entries.filter(e =>
    e.category === 'COGS' &&
    (
      // Cash OUT ONLY if NOT a Credit settlement (prevents double-counting)
      (e.entry_type === 'Cash OUT' && !e.notes?.startsWith('Settlement of Credit')) ||
      e.entry_type === 'Credit' ||
      (e.entry_type === 'Advance' && e.settled === true)  // ✅ Include settled Advance
    )
  )

  console.log('🔍 [COGS] Filtered COGS entries (for P&L):', filtered.length)

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  console.log('🔍 [COGS] Total COGS calculated:', total)

  return total
}
```

**FILTER LOGIC:**
- ✅ Include: `entry_type === 'Cash OUT'` AND `category === 'COGS'` AND `notes` does NOT start with "Settlement of Credit"
- ✅ Include: `entry_type === 'Credit'` AND `category === 'COGS'`
- ✅ Include: `entry_type === 'Advance'` AND `category === 'COGS'` AND `settled === true`
- ❌ Exclude: Cash OUT entries with notes starting with "Settlement of Credit"

---

### calculateOperatingExpenses() - COMPLETE CODE

```typescript
// File: lib/profit-calculations-new.ts (Lines 133-169)
export function calculateOperatingExpenses(entries: Entry[], startDate?: Date, endDate?: Date): number {
  console.log('🔍 [OPEX] Total entries received:', entries.length)

  const allOpexEntries = entries.filter(e => e.category === 'Opex')
  console.log('🔍 [OPEX] Opex entries found:', allOpexEntries.length)
  console.log('🔍 [OPEX] Opex breakdown:', allOpexEntries.map(e => ({
    type: e.entry_type,
    amount: e.amount,
    settled: e.settled,
    notes: e.notes
  })))

  let filtered = entries.filter(e =>
    e.category === 'Opex' &&
    (
      // Cash OUT ONLY if NOT a Credit settlement (prevents double-counting)
      (e.entry_type === 'Cash OUT' && !e.notes?.startsWith('Settlement of Credit')) ||
      e.entry_type === 'Credit' ||
      (e.entry_type === 'Advance' && e.settled === true)  // ✅ Include settled Advance
    )
  )

  console.log('🔍 [OPEX] Filtered Opex entries (for P&L):', filtered.length)

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  console.log('🔍 [OPEX] Total Opex calculated:', total)

  return total
}
```

**FILTER LOGIC:**
- ✅ Include: `entry_type === 'Cash OUT'` AND `category === 'Opex'` AND `notes` does NOT start with "Settlement of Credit"
- ✅ Include: `entry_type === 'Credit'` AND `category === 'Opex'`
- ✅ Include: `entry_type === 'Advance'` AND `category === 'Opex'` AND `settled === true`
- ❌ Exclude: Cash OUT entries with notes starting with "Settlement of Credit"

---

## 2. DATA FLOW

### How Entries Are Fetched

```typescript
// File: app/analytics/profitlens/page.tsx
export default async function ProfitLensAnalyticsPage() {
  const { entries } = await getEntries()  // ← Fetches ALL entries from database

  return (
    <div>
      <ProfitLensAnalytics entries={entries} />  // ← Passes entries to component
    </div>
  )
}
```

### How Calculations Are Called

```typescript
// File: components/analytics/profit-lens-analytics.tsx
export function ProfitLensAnalytics({ entries }: ProfitLensAnalyticsProps) {
  // entries prop contains ALL entries from database

  const { startDate, endDate } = useMemo(() => {
    const end = endOfMonth(new Date())
    let start = startOfMonth(new Date())
    return { startDate: start, endDate: end }
  }, [dateRange])

  // Calls getProfitMetrics which internally calls:
  // - calculateRevenue(entries, startDate, endDate)
  // - calculateCOGS(entries, startDate, endDate)
  // - calculateOperatingExpenses(entries, startDate, endDate)
  const currentMetrics = useMemo(
    () => getProfitMetrics(entries, startDate, endDate),
    [entries, startDate, endDate]
  )
}
```

---

## 3. DATABASE QUERY TO CHECK ENTRIES

### Check for Credit Sales Entries

```sql
SELECT
  id,
  user_id,
  entry_type,
  category,
  amount,
  settled,
  notes,
  entry_date,
  created_at
FROM entries
WHERE entry_type = 'Credit'
  AND category = 'Sales'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
id | entry_type | category | amount | settled | notes         | entry_date
---|------------|----------|--------|---------|---------------|------------
1  | Credit     | Sales    | 1000   | false   | Credit Sale   | 2025-11-29
```

---

### Check for Settlement Entries

```sql
SELECT
  id,
  user_id,
  entry_type,
  category,
  amount,
  notes,
  entry_date,
  created_at
FROM entries
WHERE notes LIKE 'Settlement of%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
id | entry_type | category | amount | notes                                    | entry_date
---|------------|----------|--------|------------------------------------------|------------
2  | Cash IN    | Sales    | 1000   | Settlement of Credit Sales (ID: 1)      | 2025-11-29
```

---

### Check for Old Terminology

```sql
SELECT
  COUNT(*) as count,
  entry_type
FROM entries
WHERE entry_type IN ('Cash Inflow', 'Cash Outflow')
GROUP BY entry_type;
```

**Expected Result:** Should return 0 rows (all migrated to 'Cash IN' and 'Cash OUT')

---

## 4. STEP-BY-STEP TRACE

### Scenario: Create Credit Sale ₹1,000

**Step 1:** User creates Credit Sale
```
Entry created in database:
{
  entry_type: 'Credit',
  category: 'Sales',
  amount: 1000,
  settled: false,
  notes: 'Credit Sale to customer'
}
```

**Step 2:** Profit Lens page loads
```
- getEntries() fetches ALL entries from database
- Passes entries array to ProfitLensAnalytics component
```

**Step 3:** calculateRevenue() is called
```typescript
entries.filter(e =>
  e.category === 'Sales' &&  // ✅ PASS (category is 'Sales')
  (
    (e.entry_type === 'Cash IN' && !e.notes?.startsWith('Settlement of Credit')) ||  // ❌ FAIL (not Cash IN)
    e.entry_type === 'Credit' ||  // ✅ PASS (entry_type is 'Credit')
    (e.entry_type === 'Advance' && e.settled === true)  // ❌ FAIL (not Advance)
  )
)
// RESULT: Entry PASSES filter ✅
```

**Step 4:** Entry is included in revenue
```
Revenue = 1000 ✅ CORRECT
```

---

### Scenario: Settle Credit Sale ₹1,000

**Step 1:** User settles Credit Sale
```
Original Credit entry:
{
  id: '1',
  entry_type: 'Credit',
  category: 'Sales',
  amount: 1000,
  settled: true,  // ← Changed to true
  settled_at: '2025-11-29'
}

New Cash IN entry created by settle_entry:
{
  id: '2',
  entry_type: 'Cash IN',
  category: 'Sales',
  amount: 1000,
  notes: 'Settlement of Credit Sales (ID: 1)'  // ← Key identifier
}
```

**Step 2:** calculateRevenue() processes BOTH entries

**Original Credit Entry:**
```typescript
e.category === 'Sales' &&  // ✅ PASS
(
  (e.entry_type === 'Cash IN' && !e.notes?.startsWith('Settlement of Credit')) ||  // ❌ FAIL
  e.entry_type === 'Credit' ||  // ✅ PASS
  (e.entry_type === 'Advance' && e.settled === true)  // ❌ FAIL
)
// RESULT: INCLUDED ✅ (adds +1000)
```

**Settlement Cash IN Entry:**
```typescript
e.category === 'Sales' &&  // ✅ PASS
(
  (e.entry_type === 'Cash IN' && !e.notes?.startsWith('Settlement of Credit')) ||
  // ↑ entry_type is 'Cash IN' ✅
  // ↑ notes is 'Settlement of Credit Sales (ID: 1)'
  // ↑ notes.startsWith('Settlement of Credit') is TRUE
  // ↑ !true is FALSE ❌
  // RESULT: First condition FAILS ❌

  e.entry_type === 'Credit' ||  // ❌ FAIL (not Credit)
  (e.entry_type === 'Advance' && e.settled === true)  // ❌ FAIL (not Advance)
)
// RESULT: EXCLUDED ✅ (does NOT add to revenue)
```

**Step 3:** Final revenue calculation
```
Revenue = 1000 (from Credit entry only) ✅ CORRECT
Settlement entry correctly excluded from Profit Lens ✅
```

---

## 5. CONSOLE LOG OUTPUT (Expected)

When Profit Lens page loads with 1 Credit Sale (₹1,000) and its settlement:

```
🔍 [REVENUE] Total entries received: 2
🔍 [REVENUE] Sales entries found: 2
🔍 [REVENUE] Sales breakdown: [
  {
    id: '1',
    type: 'Credit',
    amount: 1000,
    settled: true,
    notes: 'Credit Sale to customer',
    date: '2025-11-29'
  },
  {
    id: '2',
    type: 'Cash IN',
    amount: 1000,
    settled: false,
    notes: 'Settlement of Credit Sales (ID: 1)',
    date: '2025-11-29'
  }
]
🔍 [REVENUE] Filtered Sales entries (for P&L): 1
🔍 [REVENUE] Total revenue calculated: 1000
```

**Key Points:**
- Total Sales entries found: 2
- Filtered for P&L: 1 (only the Credit entry)
- Final revenue: ₹1,000 (correct - no double-counting)

---

## 6. DEBUGGING CHECKLIST

### User Should Check:

1. **Open Browser Console** (F12 → Console tab)
   - Visit `/analytics/profitlens` page
   - Look for 🔍 debug logs
   - Verify:
     - How many Sales entries are found?
     - How many pass the filter?
     - What is the final revenue number?

2. **Check Database Entries**
   - Run the SQL queries in Section 3
   - Verify:
     - Credit entries exist with `entry_type='Credit'`
     - Settlement entries have `notes` starting with "Settlement of Credit"
     - No old "Cash Inflow" or "Cash Outflow" entries remain

3. **Test Scenarios:**
   - Create new Credit Sale → Should appear in Profit Lens immediately
   - Settle the Credit Sale → Profit Lens should NOT change
   - Check Cash Pulse → Should show the settlement Cash IN

4. **Verify settle_entry Function**
   - Check if database function has been updated with fix-settle-entry-logic.sql
   - Test settlement to ensure it creates notes with correct format

---

## 7. POTENTIAL ISSUES

### Issue 1: Database Migration Not Run
**Symptom:** Old entries still have `entry_type='Cash Inflow'` or `'Cash Outflow'`
**Solution:** Run migration SQL:
```sql
UPDATE entries SET entry_type = 'Cash IN' WHERE entry_type = 'Cash Inflow';
UPDATE entries SET entry_type = 'Cash OUT' WHERE entry_type = 'Cash Outflow';
```

### Issue 2: settle_entry Function Not Updated
**Symptom:** Settlement entries don't have `notes` starting with "Settlement of Credit"
**Solution:** Run migration from `supabase/migrations/fix-settle-entry-logic.sql`

### Issue 3: Browser Cache
**Symptom:** Changes not reflected even after fix
**Solution:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue 4: TypeScript Type Mismatch
**Symptom:** Entries not filtered correctly
**Solution:** Check Entry type definition matches database schema

---

## 8. BUSINESS RULES VERIFICATION

### Credit Sale ₹1,000

| Action | Cash Pulse | Profit Lens | Correct? |
|--------|------------|-------------|----------|
| Create | ₹0 | +₹1,000 | ✅ |
| Settle | +₹1,000 | NO CHANGE (stays ₹1,000) | ✅ |

### Advance Sale ₹2,000

| Action | Cash Pulse | Profit Lens | Correct? |
|--------|------------|-------------|----------|
| Create | +₹2,000 | ₹0 | ✅ |
| Settle | NO CHANGE (stays ₹2,000) | +₹2,000 | ✅ |

---

## 9. NEXT STEPS FOR USER

1. **Check console logs** - Open browser console and verify the 🔍 debug output
2. **Run database queries** - Execute the SQL queries in Section 3 to verify data
3. **Test each scenario** - Create Credit Sale, settle it, check both Cash Pulse and Profit Lens
4. **Report findings** - Share:
   - Console log output
   - Database query results
   - Actual vs Expected behavior

This will help identify the exact point where the logic is failing.
