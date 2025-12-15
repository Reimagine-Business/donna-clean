# /entries Page Testing Checklist

**Before Migration:** Test this page thoroughly to ensure it's ready to replace `/daily-entries`

---

## 📋 PRE-MIGRATION VERIFICATION

### ✅ Code Structure Check

**app/entries/page.tsx:**
```typescript
✅ Imports getEntries and getCategories from actions
✅ Uses Suspense with EntryListSkeleton fallback
✅ Passes initialEntries and categories to EntriesShell
✅ Handles error state
✅ force-dynamic and revalidate: 0 set
```

**components/entries/entries-shell.tsx:**
```typescript
✅ Has SiteHeader, TopNavMobile, BottomNav
✅ Includes CreateEntryModal
✅ Has EntryList component
✅ Has filtering system (EntryFiltersBar)
✅ Has pagination (ITEMS_PER_PAGE = 20)
✅ Has bulk operations (select, delete, export)
✅ Has error and loading states
✅ Has refresh functionality
✅ Uses Entry type from @/app/entries/actions
```

**Key Features Present:**
- ✅ Create entry modal
- ✅ Edit entry modal (in EntryList)
- ✅ Delete entry dialog
- ✅ Entry details modal
- ✅ Party selector
- ✅ Filters (type, category, date range, search)
- ✅ Bulk selection mode
- ✅ CSV export
- ✅ Pagination
- ✅ Validation (from actions)
- ✅ Sanitization (from actions)
- ✅ Rate limiting (from actions)

---

## 🧪 MANUAL TESTING CHECKLIST

### **1. Page Load & Navigation** ⏱️ 5 min

- [ ] Navigate to `http://localhost:3000/entries` or `https://your-app.vercel.app/entries`
- [ ] Page loads without errors
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All entries display in list
- [ ] Pagination shows if >20 entries
- [ ] Mobile view: BottomNav visible
- [ ] Desktop view: Navigation visible

**Expected Result:** Clean page load with entries list

---

### **2. Create Entry - Cash IN** ⏱️ 3 min

- [ ] Click "Create Entry" button (Plus icon)
- [ ] Modal opens
- [ ] Select Entry Type: "Cash IN"
- [ ] Select Category: "Sales"
- [ ] Enter Amount: 5000
- [ ] Select Payment Method: "Cash"
- [ ] Enter Notes: "Test cash in entry"
- [ ] Click "Create"
- [ ] Modal closes
- [ ] New entry appears in list
- [ ] Success toast shows

**Expected Result:** Entry created successfully

---

### **3. Create Entry - Cash OUT** ⏱️ 3 min

- [ ] Click "Create Entry" button
- [ ] Select Entry Type: "Cash OUT"
- [ ] Select Category: "COGS"
- [ ] Enter Amount: 3000
- [ ] Select Payment Method: "Bank"
- [ ] Enter Notes: "Test cash out entry"
- [ ] Click "Create"
- [ ] Entry appears in list

**Expected Result:** Entry created successfully

---

### **4. Create Entry - Credit (with Party)** ⏱️ 5 min

- [ ] Click "Create Entry"
- [ ] Select Entry Type: "Credit"
- [ ] Select Category: "Sales"
- [ ] Payment Method auto-sets to "None"
- [ ] Enter Amount: 10000
- [ ] **Party Selector visible**
- [ ] Select or create party name
- [ ] Enter Notes: "Test credit entry"
- [ ] Click "Create"
- [ ] Entry appears with party name
- [ ] Payment Method shows "None"

**Expected Result:** Credit entry with party created

---

### **5. Create Entry - Advance** ⏱️ 3 min

- [ ] Click "Create Entry"
- [ ] Select Entry Type: "Advance"
- [ ] Select Category: "COGS"
- [ ] Enter Amount: 2000
- [ ] Select Payment Method: "Cash"
- [ ] Enter Notes: "Test advance entry"
- [ ] Click "Create"
- [ ] Entry appears in list

**Expected Result:** Advance entry created

---

### **6. Edit Entry** ⏱️ 3 min

- [ ] Click on any entry in the list
- [ ] Entry details modal opens
- [ ] Click "Edit" button
- [ ] Edit entry modal opens
- [ ] Change Amount to different value
- [ ] Change Notes
- [ ] Click "Save"
- [ ] Modal closes
- [ ] Changes reflected in list
- [ ] Success toast shows

**Expected Result:** Entry updated successfully

---

### **7. Delete Entry** ⏱️ 2 min

- [ ] Click on an entry
- [ ] Entry details modal opens
- [ ] Click "Delete" button
- [ ] Confirmation dialog appears
- [ ] Click "Confirm"
- [ ] Modal closes
- [ ] Entry removed from list
- [ ] Success toast shows

**Expected Result:** Entry deleted successfully

---

### **8. Filter by Type** ⏱️ 3 min

- [ ] Click "Filter" button
- [ ] Filters panel opens
- [ ] Select Type: "Cash In"
- [ ] Apply filter
- [ ] Only Cash IN entries show
- [ ] Counter shows filtered count
- [ ] Clear filters
- [ ] All entries show again

**Expected Result:** Filtering works correctly

---

### **9. Filter by Category** ⏱️ 2 min

- [ ] Open filters
- [ ] Select Category: "Sales"
- [ ] Apply
- [ ] Only Sales entries show
- [ ] Clear filters

**Expected Result:** Category filter works

---

### **10. Filter by Date Range** ⏱️ 3 min

- [ ] Open filters
- [ ] Set "From" date: Last week
- [ ] Set "To" date: Today
- [ ] Apply
- [ ] Only entries in date range show
- [ ] Clear filters

**Expected Result:** Date filtering works

---

### **11. Search Functionality** ⏱️ 2 min

- [ ] Open filters
- [ ] Enter search term in notes field
- [ ] Apply
- [ ] Entries matching search show
- [ ] Try searching by category name
- [ ] Try searching by entry type
- [ ] Clear filters

**Expected Result:** Search works across fields

---

### **12. Pagination** ⏱️ 3 min

*If you have >20 entries:*
- [ ] First page shows 20 entries
- [ ] "Next" button visible
- [ ] Click "Next"
- [ ] Page 2 shows next 20 entries
- [ ] "Previous" button works
- [ ] Page numbers work
- [ ] Scroll to top on page change

**Expected Result:** Pagination works smoothly

---

### **13. Bulk Selection Mode** ⏱️ 5 min

- [ ] Click bulk selection icon (CheckSquare)
- [ ] Checkboxes appear on entries
- [ ] Select 3 entries
- [ ] Counter shows "3 selected"
- [ ] "Select All" selects all on page
- [ ] "Deselect All" clears selection
- [ ] Can still select/deselect individually

**Expected Result:** Bulk mode works correctly

---

### **14. Bulk Delete** ⏱️ 3 min

- [ ] Enable bulk mode
- [ ] Select 2-3 entries
- [ ] Click "Delete" (Trash icon)
- [ ] Confirmation appears with count
- [ ] Confirm deletion
- [ ] Selected entries removed
- [ ] Success toast shows count
- [ ] Bulk mode exits

**Expected Result:** Bulk delete works

---

### **15. CSV Export** ⏱️ 3 min

- [ ] Enable bulk mode
- [ ] Select some entries
- [ ] Click "Export" (Download icon)
- [ ] CSV file downloads
- [ ] Open CSV
- [ ] Contains: Date, Type, Category, Amount, Payment Method, Notes
- [ ] Data is correct
- [ ] Filename includes date

**Expected Result:** CSV export works

---

### **16. Refresh Data** ⏱️ 2 min

- [ ] Make a change (create/edit/delete entry)
- [ ] Click refresh icon
- [ ] Loading indicator shows
- [ ] Data reloads
- [ ] Latest changes visible

**Expected Result:** Refresh works

---

### **17. Validation** ⏱️ 5 min

Try creating entries with invalid data:
- [ ] Empty amount → Shows error
- [ ] Negative amount → Shows error
- [ ] Future date with wrong settings → Validates correctly
- [ ] Credit without party → Still works (party optional)
- [ ] Missing required fields → Shows errors
- [ ] Try SQL injection in notes → Sanitized
- [ ] Try XSS in notes → Sanitized

**Expected Result:** Validation catches bad data

---

### **18. Error Handling** ⏱️ 3 min

- [ ] Disconnect internet
- [ ] Try creating entry
- [ ] Error message shows
- [ ] Reconnect internet
- [ ] Retry works
- [ ] Error clears on success

**Expected Result:** Graceful error handling

---

### **19. Mobile Responsiveness** ⏱️ 5 min

Test on mobile device or resize browser to mobile width:
- [ ] Layout adjusts for mobile
- [ ] BottomNav visible and functional
- [ ] TopNavMobile visible
- [ ] Create button accessible
- [ ] Modals fit screen
- [ ] Filters work on mobile
- [ ] Entry list scrolls
- [ ] Touch interactions work
- [ ] Text readable (not too small)

**Expected Result:** Mobile experience is good

---

### **20. Performance** ⏱️ 3 min

- [ ] Initial page load is fast (<2 seconds)
- [ ] Filtering is instant
- [ ] Pagination is instant
- [ ] Create/Edit modals open quickly
- [ ] No lag when scrolling
- [ ] No memory leaks (check dev tools)

**Expected Result:** App feels snappy

---

## 🔍 COMPARISON WITH /daily-entries

Open both pages side-by-side and compare:

### Features in /entries that /daily-entries DOESN'T have:
- ✅ Better filtering UI (dedicated filters bar)
- ✅ Bulk operations (select multiple, delete multiple)
- ✅ CSV export
- ✅ Better pagination (page numbers)
- ✅ Separate modals for create/edit/delete/details
- ✅ Party selector integrated better
- ✅ Validation with error messages
- ✅ Sanitization
- ✅ Rate limiting
- ✅ Auto-generated alerts
- ✅ Better error states
- ✅ Loading states

### Features in /daily-entries that /entries MIGHT be missing:
- [ ] Settlement integration (check this!)
- [ ] Debug panel (check if needed)
- [ ] Any custom business logic?

**Action:** Document any missing features below:

```
Missing features from /daily-entries:
1.
2.
3.
```

---

## 📊 TESTING SUMMARY

### Checklist Progress:
```
[ ] All 20 test sections completed
[ ] No critical bugs found
[ ] Performance is acceptable
[ ] Mobile experience is good
[ ] Feature parity with /daily-entries verified
[ ] No missing functionality
```

### Sign-off:
```
Tested by: _______________
Date: _______________
Environment: [ ] Local  [ ] Staging  [ ] Production
Result: [ ] PASS - Ready for migration  [ ] FAIL - Issues found
```

---

## 🐛 ISSUES FOUND

If any issues found during testing, document here:

### Issue #1:
- **Description:**
- **Steps to reproduce:**
- **Severity:** [ ] Critical  [ ] High  [ ] Medium  [ ] Low
- **Status:** [ ] Open  [ ] Fixed  [ ] Won't fix

### Issue #2:
- **Description:**
- **Steps to reproduce:**
- **Severity:** [ ] Critical  [ ] High  [ ] Medium  [ ] Low
- **Status:** [ ] Open  [ ] Fixed  [ ] Won't fix

---

## ✅ MIGRATION GO/NO-GO DECISION

**After completing all tests above, answer:**

1. **Does /entries have all features of /daily-entries?**
   - [ ] Yes → Proceed
   - [ ] No → Document missing features and add them first

2. **Are all CRUD operations working?**
   - [ ] Yes → Proceed
   - [ ] No → Fix issues first

3. **Is the user experience acceptable?**
   - [ ] Yes → Proceed
   - [ ] No → Improve UX first

4. **Are there any critical bugs?**
   - [ ] No → Proceed
   - [ ] Yes → Fix bugs first

5. **Is performance acceptable?**
   - [ ] Yes → Proceed
   - [ ] No → Optimize first

### **FINAL DECISION:**
- [ ] ✅ **GO** - Ready to migrate navigation to /entries
- [ ] ⛔ **NO-GO** - Issues must be fixed first

**Reason if NO-GO:**
```
List blocking issues:
1.
2.
3.
```

---

**Next Step:**
- If **GO**: Proceed to Phase 2 (Update Navigation)
- If **NO-GO**: Fix issues, re-test, then reassess
