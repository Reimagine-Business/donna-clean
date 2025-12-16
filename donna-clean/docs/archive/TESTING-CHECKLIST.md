# DONNA APPLICATION - MANUAL TESTING CHECKLIST

**Purpose:** Complete manual testing guide for the Donna business tracking application
**Version:** 1.0
**Last Updated:** November 28, 2025

---

## PRE-TESTING SETUP

### Environment Preparation
- [ ] Verify `.env.local` has correct Supabase credentials
- [ ] Run `npm install` to ensure all dependencies installed
- [ ] Run `npm run build` to verify build succeeds
- [ ] Start dev server: `npm run dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Open browser console (F12) to monitor errors
- [ ] Have test data ready (email, business details, sample transactions)

### Test Devices
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari (if available)
- [ ] Mobile iOS (iPhone)
- [ ] Mobile Android
- [ ] Tablet (iPad/Android)

---

## SECTION 1: AUTHENTICATION

### 1.1 User Registration
- [ ] Navigate to `/auth/sign-up`
- [ ] Try submitting empty form → Should show validation errors
- [ ] Enter invalid email → Should show error
- [ ] Enter password < 6 characters → Should show error
- [ ] Enter valid email + password (min 6 chars)
- [ ] Click "Sign Up"
- [ ] Should see success message about verification email
- [ ] Check email inbox for verification link
- [ ] Click verification link → Should redirect to login

**Expected Result:** ✅ Account created, verification email sent, email verified

### 1.2 User Login
- [ ] Navigate to `/auth/login`
- [ ] Try submitting empty form → Should show errors
- [ ] Enter wrong email → Should show error
- [ ] Enter wrong password → Should show error
- [ ] Enter correct credentials
- [ ] Click "Sign In"
- [ ] Should redirect to `/home` or `/dashboard`
- [ ] Should see user menu in top right (desktop) or bottom nav (mobile)

**Expected Result:** ✅ Logged in successfully, redirected to home

### 1.3 Password Reset
- [ ] Navigate to `/auth/forgot-password`
- [ ] Enter registered email
- [ ] Click "Reset Password"
- [ ] Should see success message
- [ ] Check email for reset link
- [ ] Click reset link
- [ ] Should navigate to `/auth/update-password`
- [ ] Enter new password (min 6 chars)
- [ ] Confirm password
- [ ] Submit → Should see success
- [ ] Try logging in with new password → Should work

**Expected Result:** ✅ Password reset successfully

### 1.4 Session Persistence
- [ ] Login to application
- [ ] Refresh page → Should stay logged in
- [ ] Close browser tab
- [ ] Reopen and navigate to app → Should stay logged in
- [ ] Open new incognito window → Should NOT be logged in

**Expected Result:** ✅ Session persists, secure

### 1.5 Logout
- [ ] Click user menu (desktop) or profile icon (mobile)
- [ ] Click "Logout"
- [ ] Should redirect to login page
- [ ] Try navigating to `/entries` → Should redirect to login
- [ ] Try navigating to `/profile` → Should redirect to login

**Expected Result:** ✅ Logged out, protected routes inaccessible

---

## SECTION 2: PROFILE MANAGEMENT

### 2.1 View Profile
- [ ] Login and navigate to `/profile`
- [ ] Profile page loads without errors
- [ ] Current username displayed (if set)
- [ ] Current business name displayed (if set)
- [ ] Current address displayed (if set)
- [ ] Current logo displayed (if set)
- [ ] Email displayed (read-only)

**Expected Result:** ✅ Profile data displays correctly

### 2.2 Edit Profile Information
- [ ] Click "Edit" on username field
- [ ] Change username
- [ ] Save changes → Should show success toast
- [ ] Refresh page → New username should persist

- [ ] Click "Edit" on business name
- [ ] Change business name
- [ ] Save → Success toast
- [ ] Refresh → Persists

- [ ] Click "Edit" on address
- [ ] Enter multi-line address
- [ ] Save → Success toast
- [ ] Refresh → Address persists with line breaks

**Expected Result:** ✅ All profile fields update and persist

### 2.3 Logo Upload
- [ ] Click "Change Logo" button
- [ ] **Test 1:** Try uploading non-image file (PDF, txt)
  - Should show error or reject file
- [ ] **Test 2:** Try uploading very large image (>10MB)
  - Should show error about file size
- [ ] **Test 3:** Upload valid JPEG image (<5MB)
  - Should show upload progress
  - Should show success toast
  - Image should display immediately
  - Refresh page → Image persists
- [ ] **Test 4:** Upload valid PNG image
  - Same success behavior
- [ ] **Test 5:** Replace existing logo with new image
  - Old logo replaced with new one
  - Old file deleted from storage (verify in Supabase)

**Expected Result:** ✅ Logo upload works with validation

### 2.4 Profile Edge Cases
- [ ] Try entering very long username (>100 chars) → Should limit or show error
- [ ] Try entering special characters in username → Should sanitize or validate
- [ ] Try clearing required fields → Should show validation
- [ ] Try rapid clicking save button → Should prevent duplicate requests

**Expected Result:** ✅ Validation prevents invalid data

---

## SECTION 3: ENTRIES CRUD

### 3.1 Create Entry - Income
- [ ] Navigate to `/entries`
- [ ] Click "Add Entry" button
- [ ] Modal opens

**Test Validation:**
- [ ] Try submitting empty form → All required fields show errors
- [ ] Try entering negative amount → Shows error
- [ ] Try entering amount with >2 decimals (123.456) → Shows error or rounds
- [ ] Try entering amount >99,99,99,999.99 → Shows error
- [ ] Try selecting future date → Shows error
- [ ] Try selecting date >5 years ago → Shows error

**Test Valid Entry:**
- [ ] Select type: "Income"
- [ ] Select category (e.g., "Sales")
- [ ] Enter amount: 5000
- [ ] Enter description: "Product sale"
- [ ] Select today's date
- [ ] Select payment method: "Bank"
- [ ] Enter notes: "Payment received via NEFT"
- [ ] Click "Add Entry"
- [ ] Should show success toast
- [ ] Modal should close
- [ ] Entry should appear in list
- [ ] Entry should show ₹5,000.00 (formatted)

**Expected Result:** ✅ Income entry created with validation

### 3.2 Create Entry - Expense
- [ ] Click "Add Entry"
- [ ] Select type: "Expense"
- [ ] Categories should change to expense categories
- [ ] Select category: "Office Supplies"
- [ ] Enter amount: 1200.50
- [ ] Enter description: "Stationery purchase"
- [ ] Select date: 2 days ago
- [ ] Select payment method: "Cash"
- [ ] Click "Add Entry"
- [ ] Success toast appears
- [ ] Entry appears in list with negative formatting or expense indicator

**Expected Result:** ✅ Expense entry created

### 3.3 List Entries
- [ ] All entries display in list
- [ ] Entries sorted by date (newest first)
- [ ] Each entry shows:
  - [ ] Type indicator (income=green, expense=red)
  - [ ] Category with icon
  - [ ] Amount with ₹ symbol
  - [ ] Description
  - [ ] Date formatted correctly
  - [ ] Payment method
  - [ ] Notes (if any)
- [ ] Create 10+ entries → Pagination should appear (if implemented)

**Expected Result:** ✅ Entries list correctly

### 3.4 Edit Entry
- [ ] Click "Edit" icon on any entry
- [ ] Edit modal opens with pre-filled data
- [ ] Change amount from 5000 to 6000
- [ ] Change description
- [ ] Click "Update"
- [ ] Success toast appears
- [ ] Entry updates in list
- [ ] Refresh page → Changes persist

**Test Edit Validation:**
- [ ] Try changing amount to negative → Should show error
- [ ] Try changing date to future → Should show error
- [ ] Try clearing required fields → Should show error

**Expected Result:** ✅ Entries can be edited with validation

### 3.5 Delete Entry
- [ ] Click "Delete" icon on any entry
- [ ] Confirmation dialog appears
- [ ] Click "Cancel" → Entry not deleted
- [ ] Click "Delete" again
- [ ] Click "Confirm" → Entry deleted
- [ ] Success toast appears
- [ ] Entry removed from list
- [ ] Refresh page → Entry still deleted

**Expected Result:** ✅ Entries can be deleted with confirmation

### 3.6 Filter Entries
**Filter by Type:**
- [ ] Select "Income" filter → Only income entries shown
- [ ] Select "Expense" filter → Only expense entries shown
- [ ] Select "All" → All entries shown

**Filter by Category:**
- [ ] Select a category → Only entries in that category shown
- [ ] Clear filter → All entries shown

**Filter by Date:**
- [ ] Select "This Month" → Only current month entries shown
- [ ] Select "Last 3 Months" → Entries from last 3 months shown
- [ ] Select custom date range → Only entries in range shown

**Search:**
- [ ] Enter search term in description → Matching entries shown
- [ ] Clear search → All entries shown

**Expected Result:** ✅ Filters work correctly

### 3.7 Entries Edge Cases
- [ ] Create entry on mobile → Works responsively
- [ ] Create 100 entries rapidly → Rate limiting kicks in (100/day)
- [ ] Try creating entry while offline → Shows error
- [ ] Create entry with emoji in description → Saves correctly
- [ ] Create entry with very long notes (1000 chars) → Accepts
- [ ] Try notes >1000 chars → Truncates or shows error

**Expected Result:** ✅ Edge cases handled gracefully

---

## SECTION 4: ANALYTICS

### 4.1 Cash Pulse Analytics
- [ ] Navigate to `/analytics/cashpulse`
- [ ] Page loads without errors

**Summary Cards:**
- [ ] "Cash Balance" shows sum of all income - expenses
- [ ] "Total Income" shows sum of all income entries
- [ ] "Total Expenses" shows sum of all expense entries
- [ ] Trend indicators show percentage change
- [ ] Green ↑ for positive, Red ↓ for negative

**Cash Flow Chart:**
- [ ] Line chart displays
- [ ] Two lines: Income (green) and Expenses (red)
- [ ] X-axis shows dates
- [ ] Y-axis shows amounts with ₹ symbol
- [ ] Hover over data points → Tooltip shows details
- [ ] Chart is responsive on mobile

**Category Breakdown:**
- [ ] Pie chart shows top 5 expense categories
- [ ] Each slice different color
- [ ] Labels show category name and percentage
- [ ] "Other" category for remaining expenses

**Recent Transactions:**
- [ ] Last 10 entries displayed
- [ ] Each shows type, category, amount, date

**Date Filters:**
- [ ] Click "This Month" → Data updates
- [ ] Click "Last 3 Months" → Data updates
- [ ] Click "This Year" → Data updates
- [ ] Charts and cards reflect filtered data

**CSV Export:**
- [ ] Click "Export to CSV" button
- [ ] File downloads
- [ ] Open file → Contains all transaction data
- [ ] Columns: Date, Type, Category, Amount, Description, Payment Method, Notes

**Expected Result:** ✅ Cash Pulse analytics fully functional

### 4.2 Profit Lens Analytics
- [ ] Navigate to `/analytics/profitlens`
- [ ] Page loads without errors

**Profit Overview:**
- [ ] Net Profit displays (Revenue - COGS - Operating Expenses)
- [ ] Profit Margin % displays correctly
- [ ] Green if profitable, Red if negative

**Key Metrics Grid:**
- [ ] Revenue displays (sum of specific income categories)
- [ ] COGS displays (cost of goods sold)
- [ ] Operating Expenses displays
- [ ] Gross Profit displays (Revenue - COGS)
- [ ] All values formatted with ₹

**Profit Trend Chart:**
- [ ] Bar chart shows monthly profit
- [ ] Line overlay shows profit margin %
- [ ] X-axis shows months
- [ ] Both Y-axes labeled correctly
- [ ] Hover shows tooltip

**Expense Breakdown:**
- [ ] Horizontal bar chart
- [ ] Each category shows % of total expenses
- [ ] Progress bars color-coded
- [ ] Sorted by amount (highest first)

**Insights & Recommendations:**
- [ ] At least 3-5 insights displayed
- [ ] Insights based on actual data:
  - [ ] High COGS warning (if >70%)
  - [ ] High OpEx warning (if >30%)
  - [ ] Low profit margin warning (if <10%)
  - [ ] Trend analysis (improving/declining)
  - [ ] Category-specific recommendations

**Date Filters:**
- [ ] Filters work same as Cash Pulse
- [ ] All metrics update with filter changes

**CSV Export:**
- [ ] Export button works
- [ ] File contains P&L statement

**Expected Result:** ✅ Profit Lens analytics fully functional

### 4.3 Analytics Edge Cases
- [ ] View analytics with no data → Should show empty state
- [ ] View analytics with only 1 entry → Should still display
- [ ] View analytics with 1000+ entries → Should load quickly (<3s)
- [ ] Change date filter rapidly → No crashes, updates smoothly
- [ ] Resize window → Charts remain responsive

**Expected Result:** ✅ Analytics handle edge cases

---

## SECTION 5: NOTIFICATIONS/ALERTS

### 5.1 View Alerts
- [ ] Navigate to `/notifications`
- [ ] Page loads without errors

**Alert Summary:**
- [ ] Shows total alerts count
- [ ] Shows unread count (highlighted in red)
- [ ] Shows counts by type (Info, Warning, Critical)
- [ ] Counts match actual alerts

**Alert List:**
- [ ] Unread alerts shown first
- [ ] Read alerts shown separately
- [ ] Each alert shows:
  - [ ] Icon based on type
  - [ ] Title
  - [ ] Message
  - [ ] Timestamp ("2 hours ago" format)
  - [ ] Type badge (Info/Warning/Critical)
  - [ ] Actions (Mark as read, Delete)

**Alert Styling:**
- [ ] Info alerts: Blue border/background
- [ ] Warning alerts: Yellow border/background
- [ ] Critical alerts: Red border/background
- [ ] Read alerts: Faded/reduced opacity

**Expected Result:** ✅ Alerts display correctly

### 5.2 Alert Actions
**Mark as Read:**
- [ ] Click "Mark as read" on unread alert
- [ ] Alert moves to "Read" section
- [ ] Opacity reduces
- [ ] Unread count decreases
- [ ] Refresh page → Still marked as read

**Delete Alert:**
- [ ] Click "Delete" on any alert
- [ ] Confirmation dialog appears
- [ ] Click "Confirm"
- [ ] Alert removed
- [ ] Total count decreases
- [ ] Refresh → Still deleted

**Mark All as Read:**
- [ ] Click "Mark All as Read" button
- [ ] All unread alerts move to read section
- [ ] Unread count becomes 0
- [ ] Success toast appears

**Clear Read Alerts:**
- [ ] Click "Clear Read Alerts"
- [ ] Confirmation appears
- [ ] Confirm → All read alerts deleted
- [ ] Only unread alerts remain

**Expected Result:** ✅ Alert actions work correctly

### 5.3 Alert Filters
- [ ] Click "All Types" dropdown
- [ ] Select "Info" → Only info alerts shown
- [ ] Select "Warning" → Only warning alerts shown
- [ ] Select "Critical" → Only critical alerts shown
- [ ] Select "All Types" → All alerts shown

**Search:**
- [ ] Enter search term → Matching alerts shown
- [ ] Clear search → All alerts shown

**Expected Result:** ✅ Filters and search work

### 5.4 Auto-Generated Alerts
**Note:** These may not generate without specific conditions

- [ ] Create expense >₹50,000 → Should generate high expense alert
- [ ] Create multiple expenses until income < expenses → Should generate warning
- [ ] Check if monthly summary alerts appear at end of month
- [ ] Check if low balance alerts appear when cash balance drops

**Expected Result:** ⚠️ Auto-alerts generate (may need specific setup)

---

## SECTION 6: MOBILE RESPONSIVENESS

### 6.1 Mobile Navigation
**On Mobile Device (<768px):**
- [ ] Bottom navigation bar appears
- [ ] Shows 5 icons: Home, Entries, Analytics, Alerts, Profile
- [ ] Current page highlighted
- [ ] Navigation doesn't overlap content
- [ ] Fixed to bottom of screen
- [ ] Tapping icons navigates correctly

**On Desktop (>768px):**
- [ ] Top navigation bar appears
- [ ] Shows user menu in top right
- [ ] No bottom navigation

**Expected Result:** ✅ Navigation responsive

### 6.2 Mobile Forms
**Test on Mobile:**
- [ ] Create entry modal fits on screen
- [ ] All form fields accessible
- [ ] Keyboard doesn't cover inputs
- [ ] Dropdowns work correctly
- [ ] Date picker works on mobile
- [ ] Submit button reachable
- [ ] Validation errors visible

**Expected Result:** ✅ Forms work on mobile

### 6.3 Mobile Analytics
**Test on Mobile:**
- [ ] Analytics page scrollable
- [ ] Charts resize for mobile
- [ ] All data visible
- [ ] No horizontal scroll
- [ ] Touch interactions work (pinch zoom on charts)
- [ ] Date filters accessible

**Expected Result:** ✅ Analytics responsive

### 6.4 Mobile Tables/Lists
- [ ] Entry list scrollable
- [ ] All columns visible (may stack vertically)
- [ ] Swipe to edit/delete (if implemented)
- [ ] Touch targets large enough (min 44x44px)

**Expected Result:** ✅ Lists work on mobile

---

## SECTION 7: ERROR HANDLING

### 7.1 Network Errors
- [ ] Disconnect internet
- [ ] Try creating entry → Should show error toast
- [ ] Try loading entries → Should show error state
- [ ] Reconnect internet
- [ ] Retry → Should work

**Expected Result:** ✅ Network errors handled gracefully

### 7.2 Validation Errors
- [ ] All form validations tested in Section 3
- [ ] Error messages clear and helpful
- [ ] Errors appear inline (not just toast)
- [ ] Red borders on invalid fields
- [ ] Errors clear when fixed

**Expected Result:** ✅ Validation errors clear

### 7.3 Server Errors
- [ ] If database is down → Should show error state
- [ ] If auth fails → Should redirect to login
- [ ] If API returns 500 → Should show error toast
- [ ] Errors logged to console for debugging

**Expected Result:** ✅ Server errors handled

### 7.4 Rate Limiting
- [ ] Try creating 101 entries in one day → Should show rate limit error
- [ ] Wait until next day → Should allow new entries
- [ ] Error message should be clear

**Expected Result:** ✅ Rate limiting works

---

## SECTION 8: PERFORMANCE

### 8.1 Page Load Times
- [ ] Home page loads in <2 seconds
- [ ] Entries page loads in <2 seconds
- [ ] Analytics page loads in <3 seconds (charts take time)
- [ ] Profile page loads in <2 seconds

**Measure:** Use browser DevTools → Network tab → Disable cache

**Expected Result:** ✅ Pages load quickly

### 8.2 Interaction Speed
- [ ] Form submission feels instant (<500ms)
- [ ] Filtering entries updates immediately
- [ ] Searching feels responsive
- [ ] Modal open/close smooth

**Expected Result:** ✅ App feels snappy

### 8.3 Loading States
- [ ] All async operations show loading indicator
- [ ] Skeleton loaders while fetching data
- [ ] Buttons disabled during submission
- [ ] No flash of empty content

**Expected Result:** ✅ Loading states present

---

## SECTION 9: DATA PERSISTENCE

### 9.1 Data Integrity
- [ ] Create entry → Refresh → Entry persists
- [ ] Edit entry → Refresh → Edit persists
- [ ] Delete entry → Refresh → Entry stays deleted
- [ ] Update profile → Refresh → Profile changes persist
- [ ] Mark alert as read → Refresh → Still read

**Expected Result:** ✅ All data persists correctly

### 9.2 Cross-Device Sync
**If possible, test on 2 devices with same account:**
- [ ] Create entry on Device A
- [ ] Refresh Device B → Entry appears
- [ ] Edit entry on Device B
- [ ] Refresh Device A → Edit appears

**Expected Result:** ✅ Data syncs across devices (Supabase real-time)

---

## SECTION 10: SECURITY

### 10.1 Authentication Security
- [ ] Try accessing `/entries` without login → Redirects to login
- [ ] Try accessing `/profile` without login → Redirects to login
- [ ] Try accessing another user's data → Should be blocked by RLS

**Expected Result:** ✅ Protected routes secure

### 10.2 XSS Prevention
- [ ] Try entering `<script>alert('XSS')</script>` in entry description
- [ ] Submit entry
- [ ] View entry → Script should NOT execute
- [ ] Should see escaped HTML or plain text

**Expected Result:** ✅ XSS prevented

### 10.3 SQL Injection Prevention
**Note:** Supabase handles this, but test anyway
- [ ] Try entering `'; DROP TABLE entries;--` in description
- [ ] Submit entry
- [ ] App should still work, no table dropped
- [ ] Entry saved as plain text

**Expected Result:** ✅ SQL injection prevented

---

## SECTION 11: EDGE CASES & STRESS TESTS

### 11.1 Large Data Sets
- [ ] Create 1000+ entries → App still responsive
- [ ] View analytics with 1000+ entries → Charts load <5s
- [ ] Filter 1000+ entries → Instant response

**Expected Result:** ✅ Handles large datasets

### 11.2 Long Strings
- [ ] Enter 500-char description → Saves correctly
- [ ] Enter 1000-char notes → Saves correctly
- [ ] Enter 1001-char notes → Truncated or error
- [ ] View entry with long text → Displays correctly (no overflow)

**Expected Result:** ✅ Long strings handled

### 11.3 Special Characters
- [ ] Entry with emoji 🎉 → Displays correctly
- [ ] Entry with unicode ₹™© → Displays correctly
- [ ] Entry with newlines in notes → Preserves formatting

**Expected Result:** ✅ Special chars handled

### 11.4 Concurrent Operations
- [ ] Open app in 2 tabs
- [ ] Create entry in Tab 1
- [ ] Refresh Tab 2 → Entry appears
- [ ] Delete entry in Tab 2
- [ ] Refresh Tab 1 → Entry gone

**Expected Result:** ✅ Concurrent ops work

---

## SECTION 12: ACCESSIBILITY (Basic)

### 12.1 Keyboard Navigation
- [ ] Tab through forms → Focus visible
- [ ] Submit form with Enter → Works
- [ ] Close modal with Escape → Works
- [ ] Navigate dropdowns with arrow keys → Works

**Expected Result:** ✅ Keyboard accessible

### 12.2 Screen Reader (Basic Test)
- [ ] Turn on screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Navigate site → All labels readable
- [ ] Form fields have proper labels
- [ ] Buttons announce their purpose

**Expected Result:** ✅ Screen reader compatible

### 12.3 Color Contrast
- [ ] Text readable on all backgrounds
- [ ] Error messages visible
- [ ] Charts have sufficient contrast

**Expected Result:** ✅ Good contrast

---

## BUGS FOUND

### Critical Bugs
| # | Description | Steps to Reproduce | Expected | Actual | Priority |
|---|-------------|-------------------|----------|--------|----------|
| 1 |             |                   |          |        | 🔴 High  |

### Minor Bugs
| # | Description | Steps to Reproduce | Expected | Actual | Priority |
|---|-------------|-------------------|----------|--------|----------|
| 1 |             |                   |          |        | 🟡 Low   |

---

## OVERALL TEST RESULTS

**Date Tested:** _______________
**Tester:** _______________
**Environment:** Development / Production
**Build Version:** _______________

### Summary
- Total Tests: _______________
- Passed: _______________
- Failed: _______________
- Pass Rate: _______________%

### Recommendation
- [ ] ✅ Ready for production
- [ ] ⚠️ Ready with minor issues (document bugs)
- [ ] ❌ Not ready (critical bugs found)

### Notes
_________________________
_________________________
_________________________
