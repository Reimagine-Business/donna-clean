"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Download, Edit3, Trash2, Handshake } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createEntry as addEntryAction, updateEntry as updateEntryAction, deleteEntry as deleteEntryAction } from "@/app/entries/actions";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Party = {
  id: string
  name: string
  party_type: string
}

type DailyEntriesShellProps = {
  initialEntries: Entry[];
  userId: string;
  parties: Party[];
};

type EntryFormState = {
  entry_type: EntryType;
  category: CategoryType;
  payment_method: PaymentMethod;
  amount: string;
  entry_date: string;
  notes: string;
  party_id: string;
};

type FiltersState = {
  entry_type: EntryType | "All";
  category: CategoryType | "All";
  payment_method: PaymentMethod | "All";
  start_date: string;
  end_date: string;
  search: string;
};

const today = format(new Date(), "yyyy-MM-dd");
const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");

const buildInitialFormState = (): EntryFormState => ({
  entry_type: ENTRY_TYPES[0],
  category: CATEGORIES[0],
  payment_method: PAYMENT_METHODS[0],
  amount: "",
  entry_date: today,
  notes: "",
  party_id: "",
});

const buildInitialFiltersState = (): FiltersState => ({
  entry_type: "All",
  category: "All",
  payment_method: "All",
  start_date: defaultStart,
  end_date: today,
  search: "",
});

const CREDIT_PAYMENT_METHOD: PaymentMethod = "None";
const CREDIT_METHOD_OPTIONS = [CREDIT_PAYMENT_METHOD] as const;
const CASH_PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS as readonly PaymentMethod[];

const entryTypeIsCredit = (type: EntryType): boolean => type === "Credit";

const entryTypeRequiresCashMovement = (type: EntryType): boolean =>
  type === "Cash IN" || type === "Cash OUT" || type === "Advance";

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

export function DailyEntriesShell({ initialEntries, userId, parties }: DailyEntriesShellProps) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<EntryFormState>(buildInitialFormState);
  const [filters, setFilters] = useState<FiltersState>(buildInitialFiltersState);
  const [settlementEntry, setSettlementEntry] = useState<Entry | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("public:entries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setEntries((prev) => {
            switch (payload.eventType) {
                case "INSERT": {
                  const newEntry = normalizeEntry(payload.new);
                  if (prev.some((e) => e.id === newEntry.id)) {
                    return prev.map((entry) => (entry.id === newEntry.id ? newEntry : entry));
                  }
                  return [newEntry, ...prev];
                }
                case "UPDATE": {
                  const updated = normalizeEntry(payload.new);
                  return prev.map((entry) => (entry.id === updated.id ? updated : entry));
                }
              case "DELETE": {
                const deletedId = (payload.old as Entry).id;
                return prev.filter((entry) => entry.id !== deletedId);
              }
              default:
                return prev;
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const handleInputChange = <K extends keyof EntryFormState>(
    name: K,
    value: EntryFormState[K],
  ) => {
    if (name === "entry_type") {
      const nextEntryType = value as EntryType;
      setFormValues((prev) => ({
        ...prev,
        entry_type: nextEntryType,
        payment_method: enforcePaymentMethodForType(nextEntryType, prev.payment_method),
      }));
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
        notes: formValues.notes || undefined,
        party_id: formValues.party_id || undefined,
      };

      console.log("Saving entry payload", payload);

      if (editingEntryId) {
        // Use Server Action for update
        const result = await updateEntryAction(editingEntryId, payload);
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        setSuccessMessage("Entry updated!");
      } else {
        // Use Server Action for insert
        const result = await addEntryAction(payload);
        if (result?.error) {
          throw new Error(result.error || 'Unknown error');
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
        party_id: entry.party_id ?? "",
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
        alert(`Failed to delete entry: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      alert("Failed to delete entry. Please try again.");
    }
  };

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const matchesType = filters.entry_type === "All" || entry.entry_type === filters.entry_type;
        const matchesCategory = filters.category === "All" || entry.category === filters.category;
        const matchesPayment =
          filters.payment_method === "All" || entry.payment_method === filters.payment_method;
        const matchesDate =
          (!filters.start_date || entry.entry_date >= filters.start_date) &&
          (!filters.end_date || entry.entry_date <= filters.end_date);
        const matchesSearch =
          !filters.search ||
          (entry.notes ?? "")
            .toLowerCase()
            .includes(filters.search.trim().toLowerCase());
        return matchesType && matchesCategory && matchesPayment && matchesDate && matchesSearch;
      })
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }, [entries, filters]);

  const handleExportCsv = () => {
    if (!filteredEntries.length) return;
    const headers = [
      "Date",
      "Entry Type",
      "Category",
      "Payment Method",
      "Amount",
      "Notes",
    ];
    const rows = filteredEntries.map((entry) => [
      entry.entry_date,
      entry.entry_type,
      entry.category,
      entry.payment_method,
      entry.amount.toString(),
      entry.notes?.replace(/"/g, '""') ?? "",
    ]);
    const csvContent = [headers, ...rows]
      .map((line) => line.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `donna-daily-entries-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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

  return (
    <div className="flex flex-col gap-10 text-white">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Entries</h1>
        <p className="text-sm text-slate-300">
          Record every inflow/outflow to keep Donna in sync.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm uppercase text-slate-400">Entry Type</Label>
                <select
                  value={formValues.entry_type}
                  onChange={(event) =>
                    handleInputChange("entry_type", event.target.value as EntryType)
                  }
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
              >
                {ENTRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
                <p className="text-xs text-slate-500">
                  Sales entries are saved as inflows; expenses default to outflows.
                </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm uppercase text-slate-400">Category</Label>
              <select
                value={formValues.category}
                onChange={(event) =>
                  handleInputChange("category", event.target.value as CategoryType)
                }
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
              >
                {CATEGORIES.map((category) => {
                  // Cash IN: Only Sales is enabled
                  // Cash OUT: Only Sales is disabled (COGS, Opex, Assets enabled)
                  // Credit/Advance: All categories enabled
                  const isCashIn = formValues.entry_type === "Cash IN";
                  const isCashOut = formValues.entry_type === "Cash OUT";
                  const isDisabled =
                    (isCashIn && category !== "Sales") ||
                    (isCashOut && category === "Sales");

                  return (
                    <option key={category} value={category} disabled={isDisabled}>
                      {category}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm uppercase text-slate-400">Payment Method</Label>
              <select
                value={formValues.payment_method}
                onChange={(event) =>
                  handleInputChange("payment_method", event.target.value as PaymentMethod)
                }
                disabled={isCreditEntry}
                aria-disabled={isCreditEntry}
                className={cn(
                  "w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]",
                  isCreditEntry && "cursor-not-allowed opacity-60",
                )}
              >
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{paymentMethodHelperText}</p>
              {paymentMethodError && (
                <p className="text-xs text-rose-400">{paymentMethodError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm uppercase text-slate-400">Amount</Label>
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
                className="border-white/10 bg-slate-950/80 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm uppercase text-slate-400">Date</Label>
              <Input
                type="date"
                value={formValues.entry_date}
                onChange={(event) => handleInputChange("entry_date", event.target.value)}
                className="border-white/10 bg-slate-950/80"
                max={today}
                required
              />
            </div>
            {/* Customer/Vendor */}
            <div className="space-y-2">
              <Label className="text-sm uppercase text-slate-400">
                Customer/Vendor
                {(formValues.entry_type === 'Credit' || formValues.entry_type === 'Advance') && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </Label>
              <select
                value={formValues.party_id}
                onChange={(event) => handleInputChange("party_id", event.target.value)}
                required={formValues.entry_type === 'Credit' || formValues.entry_type === 'Advance'}
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa] text-white"
              >
                <option value="">None</option>
                {parties
                  .filter(p => {
                    // Filter customers for Sales, vendors for expenses
                    if (formValues.category === 'Sales') {
                      return p.party_type === 'Customer' || p.party_type === 'Both'
                    }
                    return p.party_type === 'Vendor' || p.party_type === 'Both'
                  })
                  .map(party => (
                    <option key={party.id} value={party.id}>
                      {party.name} ({party.party_type})
                    </option>
                  ))
                }
              </select>
              <p className="text-xs text-slate-500">
                {formValues.entry_type === 'Credit' || formValues.entry_type === 'Advance'
                  ? 'Required for Credit/Advance entries'
                  : 'Optional - track which customer/vendor'}
              </p>
              {(formValues.entry_type === 'Credit' || formValues.entry_type === 'Advance') &&
               parties.filter(p => formValues.category === 'Sales' ?
                 (p.party_type === 'Customer' || p.party_type === 'Both') :
                 (p.party_type === 'Vendor' || p.party_type === 'Both')).length === 0 && (
                <p className="text-sm text-yellow-400 mt-1">
                  ⚠️ No {formValues.category === 'Sales' ? 'customers' : 'vendors'} found.{' '}
                  <a href="/parties" className="underline hover:text-yellow-300">Create one first</a>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm uppercase text-slate-400">Notes</Label>
              <textarea
                value={formValues.notes}
                onChange={(event) => handleInputChange("notes", event.target.value)}
                placeholder="Add quick context"
                className="min-h-[80px] w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-400">{formError}</p>}
          {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#a78bfa] px-6 py-2 text-base font-semibold text-white shadow-lg shadow-[#a78bfa]/30 hover:bg-[#9770ff]"
            >
              {isSubmitting
                ? "Saving..."
                : editingEntryId
                  ? "Update Entry"
                  : "Record Entry"}
            </Button>
            {editingEntryId && (
              <Button
                type="button"
                variant="ghost"
                className="text-slate-300 hover:text-white"
                onClick={resetForm}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-4">
            <div>
              <Label className="text-xs uppercase text-slate-400">From</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, start_date: event.target.value }))
                }
                className="border-white/10 bg-slate-950/80"
                max={filters.end_date || today}
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-slate-400">To</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, end_date: event.target.value }))
                }
                className="border-white/10 bg-slate-950/80"
                max={today}
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-slate-400">Entry Type</Label>
              <select
                value={filters.entry_type}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    entry_type: event.target.value as FiltersState["entry_type"],
                  }))
                }
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm"
              >
                <option>All</option>
                {ENTRY_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase text-slate-400">Category</Label>
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: event.target.value as FiltersState["category"],
                  }))
                }
                className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm"
              >
                <option>All</option>
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-300 hover:text-white"
              onClick={() => setFilters(buildInitialFiltersState())}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#a78bfa]/60 text-[#a78bfa]"
              disabled={!filteredEntries.length}
              onClick={handleExportCsv}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label className="text-xs uppercase text-slate-400">Payment Method</Label>
            <select
              value={filters.payment_method}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  payment_method: event.target.value as FiltersState["payment_method"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm"
            >
              <option>All</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase text-slate-400">Search notes</Label>
            <Input
              type="text"
              placeholder="Search by note keywords"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              className="mt-1 border-white/10 bg-slate-950/80"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          <p className="text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{filteredEntries.length}</span>{" "}
            {filteredEntries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Entry Type</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                    No entries match your filters yet.
                  </td>
                </tr>
              )}
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t border-white/5 bg-white/5 text-slate-100 transition hover:bg-white/10"
                >
                  <td className="px-3 py-3 font-medium">{format(new Date(entry.entry_date), "dd MMM")}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        entry.entry_type === "Cash IN" && "bg-emerald-500/20 text-emerald-300",
                        entry.entry_type === "Cash OUT" && "bg-rose-500/20 text-rose-300",
                        entry.entry_type === "Credit" && "bg-amber-500/20 text-amber-200",
                        entry.entry_type === "Advance" && "bg-sky-500/20 text-sky-200",
                      )}
                    >
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-3 py-3">{entry.category}</td>
                  <td className="px-3 py-3 font-semibold text-white">
                    {currencyFormatter.format(entry.amount)}
                  </td>
                  <td className="px-3 py-3">{entry.payment_method}</td>
                  <td className="px-3 py-3 max-w-[200px] truncate">{entry.notes ?? "—"}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-300 hover:text-white"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-300 hover:text-rose-200"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {!entry.settled &&
                        (entry.entry_type === "Credit" || entry.entry_type === "Advance") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#a78bfa] hover:text-white"
                            onClick={() => setSettlementEntry(entry)}
                          >
                            <Handshake className="mr-1 h-4 w-4" />
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
