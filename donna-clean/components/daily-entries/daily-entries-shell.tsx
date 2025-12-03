"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Edit3, Trash2, Handshake } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  ENTRY_TYPES,
  PAYMENT_METHODS,
  type Entry,
  type EntryType,
  type CategoryType,
  type PaymentMethod,
  normalizeEntry,
} from "@/lib/entries";
import { SettleEntryDialog } from "@/components/settlements/settle-entry-dialog";
import { PartySelector } from "@/components/entries/party-selector";
import { addEntry as addEntryAction, updateEntry as updateEntryAction, deleteEntry as deleteEntryAction } from "@/app/daily-entries/actions";
import { showError, showWarning } from "@/lib/toast";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type DailyEntriesShellProps = {
  initialEntries: Entry[];
  userId: string;
};

type EntryFormState = {
  entry_type: EntryType;
  category: CategoryType;
  payment_method: PaymentMethod;
  amount: string;
  entry_date: string;
  notes: string;
  party_id?: string;
};

type DateFilterOption = "this-month" | "last-month" | "this-year" | "last-year" | "all-time" | "customize";

const today = format(new Date(), "yyyy-MM-dd");
const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");

const buildInitialFormState = (): EntryFormState => ({
  entry_type: ENTRY_TYPES[0],
  category: CATEGORIES[0],
  payment_method: PAYMENT_METHODS[0],
  amount: "",
  entry_date: today,
  notes: "",
});


const CREDIT_PAYMENT_METHOD: PaymentMethod = "None";
const CREDIT_METHOD_OPTIONS = [CREDIT_PAYMENT_METHOD] as const;
const CASH_PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS as readonly PaymentMethod[];

const entryTypeIsCredit = (type: EntryType): boolean => type === "Credit";

const entryTypeRequiresCashMovement = (type: EntryType): boolean =>
  type === "Cash IN" || type === "Cash OUT" || type === "Advance";

// Get valid categories for an entry type
const getValidCategories = (entryType: EntryType): readonly CategoryType[] => {
  if (entryType === "Cash IN") {
    return ["Sales"] as const;
  }
  if (entryType === "Cash OUT") {
    return ["COGS", "Opex", "Assets"] as const;
  }
  // Credit and Advance allow all categories
  return CATEGORIES;
};

// Check if a category is valid for an entry type
const isCategoryValid = (entryType: EntryType, category: CategoryType): boolean => {
  const validCategories = getValidCategories(entryType);
  return validCategories.includes(category);
};

// Get the first valid category for an entry type
const getDefaultCategoryForEntryType = (entryType: EntryType): CategoryType => {
  const validCategories = getValidCategories(entryType);
  return validCategories[0];
};

const enforcePaymentMethodForType = (
  entryType: EntryType,
  paymentMethod: PaymentMethod,
): PaymentMethod => {
  if (entryTypeIsCredit(entryType)) {
    return CREDIT_PAYMENT_METHOD;
  }
  if (entryTypeRequiresCashMovement(entryType) && paymentMethod === CREDIT_PAYMENT_METHOD) {
    return PAYMENT_METHODS[0];
  }
  return paymentMethod;
};

const paymentMethodRuleViolation = (
  entryType: EntryType,
  paymentMethod: PaymentMethod,
): string | null => {
  if (entryTypeIsCredit(entryType) && paymentMethod !== CREDIT_PAYMENT_METHOD) {
    return "Credit entries must use Payment Method: None";
  }
  if (entryTypeRequiresCashMovement(entryType) && paymentMethod === CREDIT_PAYMENT_METHOD) {
    return "This entry type requires actual payment";
  }
  return null;
};

export function DailyEntriesShell({ initialEntries, userId }: DailyEntriesShellProps) {
  const supabase = useMemo(() => createClient(), []);

  // Initialize state with server-fetched entries for immediate display
  // useEffect below will sync when initialEntries changes (page revalidation)
  const [entries, setEntries] = useState<Entry[]>(initialEntries);

  // Sync initialEntries to state whenever it changes (e.g., page revalidation)
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("this-month");
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false);
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();

  const [formValues, setFormValues] = useState<EntryFormState>(buildInitialFormState);
  const [settlementEntry, setSettlementEntry] = useState<Entry | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // REALTIME SUBSCRIPTIONS REMOVED - Causing infinite loops and crashes
  // Component now uses simple data fetching without live updates
  // Use router.refresh() or manual page refresh to update data

  const handleInputChange = <K extends keyof EntryFormState>(
    name: K,
    value: EntryFormState[K],
  ) => {
    if (name === "entry_type") {
      const nextEntryType = value as EntryType;
      setFormValues((prev) => {
        // Check if current category is valid for the new entry type
        const currentCategoryValid = isCategoryValid(nextEntryType, prev.category);
        const newCategory = currentCategoryValid
          ? prev.category
          : getDefaultCategoryForEntryType(nextEntryType);

        return {
          ...prev,
          entry_type: nextEntryType,
          category: newCategory,
          payment_method: enforcePaymentMethodForType(nextEntryType, prev.payment_method),
        };
      });
      setPaymentMethodError(null);
      return;
    }

    if (name === "payment_method") {
      const nextPaymentMethod = value as PaymentMethod;
      setFormValues((prev) => {
        const violation = paymentMethodRuleViolation(prev.entry_type, nextPaymentMethod);
        if (violation) {
          setPaymentMethodError(violation);
          return prev;
        }
        setPaymentMethodError(null);
        return { ...prev, payment_method: nextPaymentMethod };
      });
      return;
    }

    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmountBlur = () => {
    if (!formValues.amount) return;
    const numeric = Number(formValues.amount.replace(/,/g, ""));
    if (!Number.isNaN(numeric)) {
      setFormValues((prev) => ({ ...prev, amount: numberFormatter.format(numeric) }));
    }
  };

  const resetForm = () => {
    setFormValues(buildInitialFormState());
    setEditingEntryId(null);
    setFormError(null);
    setPaymentMethodError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const numericAmount = Number(formValues.amount.replace(/,/g, ""));
      if (!numericAmount || Number.isNaN(numericAmount)) {
        setFormError("Enter a valid amount.");
        setIsSubmitting(false);
        return;
      }

      const selectedEntryType = formValues.entry_type;
      const paymentMethod = formValues.payment_method;

      const paymentValidationMessage = paymentMethodRuleViolation(
        selectedEntryType,
        paymentMethod,
      );

      if (paymentValidationMessage) {
        setFormError(paymentValidationMessage);
        setPaymentMethodError(paymentValidationMessage);
        setIsSubmitting(false);
        return;
      }

      const normalizedPaymentMethod = entryTypeIsCredit(selectedEntryType)
        ? CREDIT_PAYMENT_METHOD
        : paymentMethod;

      const payload = {
        entry_type: selectedEntryType,
        category: formValues.category,
        payment_method: normalizedPaymentMethod,
        amount: numericAmount,
        entry_date: formValues.entry_date,
        notes: formValues.notes || null,
        image_url: null,
        party_id: formValues.party_id,
      };

      if (editingEntryId) {
        // Use Server Action for update
        const result = await updateEntryAction(editingEntryId, payload);
        if (!result.success) {
          throw new Error(result.error);
        }
        setSuccessMessage("Entry updated!");
      } else {
        // Use Server Action for insert
        const result = await addEntryAction(payload);
        if (result?.error) {
          throw new Error(result.error);
        }
        setSuccessMessage("Entry saved!");
      }

      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save entry.");
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleEdit = (entry: Entry) => {
      setEditingEntryId(entry.id);
      setFormError(null);
      setPaymentMethodError(null);
      const sanitizedPaymentMethod = enforcePaymentMethodForType(
        entry.entry_type,
        entry.payment_method,
      );
      setFormValues({
        entry_type: entry.entry_type,
        category: entry.category,
        payment_method: sanitizedPaymentMethod,
        amount: numberFormatter.format(entry.amount),
        entry_date: entry.entry_date,
        notes: entry.notes ?? "",
        party_id: entry.party_id ?? undefined,
      });
    };

  const handleDelete = async (entryId: string) => {
    const confirmed = window.confirm("Delete this entry?");
    if (!confirmed) return;

    try {
      // Use Server Action for delete
      const result = await deleteEntryAction(entryId);
      if (!result.success) {
        console.error("Failed to delete entry:", result.error);
        showError(`Failed to delete entry: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      showError("Failed to delete entry. Please try again.");
    }
  };

  // Function to get date range based on filter
  const getDateRange = useMemo(() => {
    const now = new Date();

    switch (dateFilter) {
      case "this-month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };

      case "last-month":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0),
        };

      case "this-year":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(now.getFullYear(), 11, 31),
        };

      case "last-year":
        return {
          from: new Date(now.getFullYear() - 1, 0, 1),
          to: new Date(now.getFullYear() - 1, 11, 31),
        };

      case "all-time":
        return {
          from: new Date(2000, 0, 1), // Far past date
          to: new Date(2099, 11, 31), // Far future date
        };

      case "customize":
        if (customFromDate && customToDate) {
          return {
            from: customFromDate,
            to: customToDate,
          };
        }
        // Default to this month if custom dates not set
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };

      default:
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
    }
  }, [dateFilter, customFromDate, customToDate]);

  // Filter entries based on date range
  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      // Parse entry_date explicitly in local time to avoid timezone issues
      // entry_date is "yyyy-MM-dd" format (e.g., "2025-01-15")
      const [year, month, day] = entry.entry_date.split('-').map(Number);
      const entryDate = new Date(year, month - 1, day); // month is 0-indexed

      const fromDate = new Date(getDateRange.from);
      const toDate = new Date(getDateRange.to);

      // Set time to start/end of day for accurate comparison
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      // entryDate is already at 00:00:00 from constructor

      const isInRange = entryDate >= fromDate && entryDate <= toDate;
      return isInRange;
    });

    return filtered.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }, [entries, getDateRange]);

  const handleExportToExcel = () => {
    if (filteredEntries.length === 0) {
      showWarning("No entries to export for the selected date range.");
      return;
    }

    // Format data for Excel
    const headers = [
      "Date",
      "Entry Type",
      "Category",
      "Amount",
      "Payment Method",
      "Is Settled",
      "Notes",
    ];

    const rows = filteredEntries.map((entry) => [
      format(new Date(entry.entry_date), "MMM dd, yyyy"),
      entry.entry_type,
      entry.category || "-",
      `₹${entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      entry.payment_method || "-",
      entry.settled ? "Yes" : "No",
      (entry.notes || "-").replace(/"/g, '""'),
    ]);

    const csvContent = [headers, ...rows]
      .map((line) => line.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    // Generate filename with date range
    const fromDate = format(getDateRange.from, "yyyy-MM-dd");
    const toDate = format(getDateRange.to, "yyyy-MM-dd");
    const filename = `daily-entries-${fromDate}-to-${toDate}.csv`;

    anchor.href = url;
    anchor.download = filename;
    anchor.style.visibility = "hidden";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  // Handle date filter change
  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as DateFilterOption;
    setDateFilter(value);
    setShowCustomDatePickers(value === "customize");
  };

    const isCreditEntry = entryTypeIsCredit(formValues.entry_type);
    const paymentMethodOptions = isCreditEntry
      ? CREDIT_METHOD_OPTIONS
      : CASH_PAYMENT_METHOD_OPTIONS;
    const paymentMethodHelperText = isCreditEntry
      ? "Credit entries use 'None' – cash moves only on settlement"
      : entryTypeRequiresCashMovement(formValues.entry_type)
        ? "This entry type requires actual payment"
        : "Use Cash or Bank to match how money moved";

    // Get valid categories for current entry type
    const validCategories = getValidCategories(formValues.entry_type);
    const categoryHelperText =
      formValues.entry_type === "Cash IN"
        ? "Cash IN entries must use Sales category"
        : formValues.entry_type === "Cash OUT"
          ? "Cash OUT entries must use expense categories (COGS, Opex, Assets)"
          : "All categories available for Credit and Advance entries";

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Record what happened today</h1>
      </div>

      <section className="rounded-xl md:rounded-2xl border border-border bg-card/60 p-3 md:p-6 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
            <div className="grid gap-3 md:gap-5 md:grid-cols-2">
            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-xs md:text-sm uppercase text-muted-foreground">Entry Type</Label>
                <select
                  value={formValues.entry_type}
                  onChange={(event) =>
                    handleInputChange("entry_type", event.target.value as EntryType)
                  }
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-1.5 md:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ENTRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Sales entries are saved as inflows; expenses default to outflows.
                </p>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-xs md:text-sm uppercase text-muted-foreground">Category</Label>
              <select
                value={formValues.category}
                onChange={(event) =>
                  handleInputChange("category", event.target.value as CategoryType)
                }
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-1.5 md:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((category) => {
                  const isValid = validCategories.includes(category);
                  return (
                    <option
                      key={category}
                      value={category}
                      disabled={!isValid}
                      className={!isValid ? "text-muted-foreground opacity-50" : ""}
                    >
                      {category}{!isValid ? " (not available)" : ""}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] md:text-xs text-muted-foreground">{categoryHelperText}</p>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-xs md:text-sm uppercase text-muted-foreground">Payment Method</Label>
              <select
                value={formValues.payment_method}
                onChange={(event) =>
                  handleInputChange("payment_method", event.target.value as PaymentMethod)
                }
                disabled={isCreditEntry}
                aria-disabled={isCreditEntry}
                className={cn(
                  "w-full rounded-lg border border-border bg-secondary/50 px-3 py-1.5 md:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                  isCreditEntry && "cursor-not-allowed opacity-60",
                )}
              >
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{paymentMethodHelperText}</p>
              {paymentMethodError && (
                <p className="text-xs text-rose-400">{paymentMethodError}</p>
              )}
            </div>
            <PartySelector
              entryType={formValues.entry_type}
              category={formValues.category}
              value={formValues.party_id}
              onChange={(partyId) => handleInputChange("party_id", partyId)}
              required={formValues.entry_type === "Credit" || formValues.entry_type === "Advance"}
            />
            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-xs md:text-sm uppercase text-muted-foreground">Amount</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formValues.amount}
                onChange={(event) =>
                  handleInputChange(
                    "amount",
                    event.target.value.replace(/[^\d.]/g, "").replace(/^0+/, ""),
                  )
                }
                onBlur={handleAmountBlur}
                placeholder="0.00"
                className="border-border bg-secondary/50 text-sm md:text-base py-1.5 md:py-2"
                required
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-xs md:text-sm uppercase text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={formValues.entry_date}
                onChange={(event) => handleInputChange("entry_date", event.target.value)}
                className="border-border bg-secondary/50 text-sm py-1.5 md:py-2"
                max={today}
                required
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label className="text-xs md:text-sm uppercase text-muted-foreground">Notes</Label>
              <textarea
                value={formValues.notes}
                onChange={(event) => handleInputChange("notes", event.target.value)}
                placeholder="Add quick context"
                className="min-h-[60px] md:min-h-[80px] w-full rounded-lg border border-border bg-secondary/50 px-3 py-1.5 md:py-2 text-xs md:text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {formError && <p className="text-xs md:text-sm text-red-400">{formError}</p>}
          {successMessage && <p className="text-xs md:text-sm text-emerald-400">{successMessage}</p>}

          <div className="flex flex-wrap gap-2 md:gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary px-4 md:px-6 py-1.5 md:py-2 text-sm md:text-base font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
            >
              {isSubmitting
                ? "Saving..."
                : editingEntryId
                  ? "Update Entry"
                  : "Record Daily Entry"}
            </Button>
            {editingEntryId && (
              <Button
                type="button"
                variant="ghost"
                className="text-xs md:text-sm text-foreground/70 hover:text-white px-3 md:px-4 py-1.5 md:py-2"
                onClick={resetForm}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl md:rounded-2xl border border-border bg-card/40 p-3 md:p-6">
        <div className="mb-3 md:mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
          <h2 className="text-base md:text-xl font-bold">Transaction History</h2>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[10px] md:text-sm text-muted-foreground">Date:</span>
              <select
                value={dateFilter}
                onChange={handleDateFilterChange}
                className="px-2 md:px-3 py-1 md:py-2 border border-border bg-secondary rounded-lg text-[10px] md:text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="this-month">📅 This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-year">This Year</option>
                <option value="last-year">Last Year</option>
                <option value="all-time">All Time</option>
                <option value="customize">Customize</option>
              </select>

              {/* Show calendar pickers when Customize is selected */}
              {showCustomDatePickers && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="px-2 md:px-3 py-1 md:py-2 border border-border bg-secondary rounded-lg text-[10px] md:text-sm text-white hover:bg-primary/80 focus:border-purple-500 focus:outline-none">
                        {customFromDate ? format(customFromDate, "MMM dd, yyyy") : "From Date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customFromDate}
                        onSelect={setCustomFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-[10px] md:text-sm text-muted-foreground">to</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="px-2 md:px-3 py-1 md:py-2 border border-border bg-secondary rounded-lg text-[10px] md:text-sm text-white hover:bg-primary/80 focus:border-purple-500 focus:outline-none">
                        {customToDate ? format(customToDate, "MMM dd, yyyy") : "To Date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customToDate}
                        onSelect={setCustomToDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>

            {/* Export to Excel Button */}
            <button
              onClick={handleExportToExcel}
              disabled={filteredEntries.length === 0}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1 md:py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-[10px] md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xs md:text-base">📥</span>
              <span>Export to Excel</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left text-[10px] md:text-xs uppercase text-muted-foreground">
                <th className="px-2 md:px-3 py-1.5 md:py-2">Date</th>
                <th className="px-2 md:px-3 py-1.5 md:py-2">Entry Type</th>
                <th className="px-2 md:px-3 py-1.5 md:py-2">Category</th>
                <th className="px-2 md:px-3 py-1.5 md:py-2">Amount</th>
                <th className="px-2 md:px-3 py-1.5 md:py-2">Payment</th>
                <th className="px-2 md:px-3 py-1.5 md:py-2 hidden md:table-cell">Notes</th>
                <th className="px-2 md:px-3 py-1.5 md:py-2 hidden md:table-cell">Party</th>
                <th className="px-2 md:px-3 py-1.5 md:py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 md:px-3 py-6 md:py-10 text-center text-xs md:text-sm text-muted-foreground">
                    No entries match your filters yet.
                  </td>
                </tr>
              )}
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t border-border/50 bg-white/5 text-slate-100 transition hover:bg-white/10"
                >
                  <td className="px-2 md:px-3 py-2 md:py-3 font-medium text-[10px] md:text-sm">{format(new Date(entry.entry_date), "dd MMM")}</td>
                  <td className="px-2 md:px-3 py-2 md:py-3">
                    <span
                      className={cn(
                        "rounded-full px-1.5 md:px-2 py-0.5 md:py-1 text-[9px] md:text-xs font-semibold",
                        entry.entry_type === "Cash IN" && "bg-emerald-500/20 text-emerald-300",
                        entry.entry_type === "Cash OUT" && "bg-rose-500/20 text-rose-300",
                        entry.entry_type === "Credit" && "bg-primary/20 text-accent",
                        entry.entry_type === "Advance" && "bg-primary/20 text-accent",
                      )}
                    >
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-sm">{entry.category}</td>
                  <td className="px-2 md:px-3 py-2 md:py-3 font-semibold text-white text-xs md:text-sm">
                    {currencyFormatter.format(entry.amount)}
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-sm">{entry.payment_method}</td>
                  <td className="px-3 py-3 max-w-[200px] truncate text-sm hidden md:table-cell">{entry.notes ?? "—"}</td>
                  <td className="px-3 py-3 text-sm hidden md:table-cell">
                    {entry.party?.name ? (
                      <span className="text-white">{entry.party.name}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 md:px-3 py-2 md:py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1 md:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-foreground/70 hover:text-white h-7 w-7 md:h-9 md:w-9"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit3 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-300 hover:text-rose-200 h-7 w-7 md:h-9 md:w-9"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      {!entry.settled &&
                        (entry.entry_type === "Credit" || entry.entry_type === "Advance") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-white text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5"
                            onClick={() => setSettlementEntry(entry)}
                          >
                            <Handshake className="mr-0.5 md:mr-1 h-3 w-3 md:h-4 md:w-4" />
                            Settle
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <SettleEntryDialog entry={settlementEntry} onClose={() => setSettlementEntry(null)} />
    </div>
  );
}
