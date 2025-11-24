"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Download, Edit3, Trash2, UploadCloud, X, Handshake } from "lucide-react";

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
import { SettleEntryDialog } from "@/components/settlement/settle-entry-dialog";
import { addEntry as addEntryAction, updateEntry as updateEntryAction, deleteEntry as deleteEntryAction } from "@/app/daily-entries/actions";

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
};

type DateFilterOption = "this-month" | "last-month" | "this-year" | "customize";

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
  type === "Cash Inflow" || type === "Cash Outflow" || type === "Advance";

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
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("this-month");
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false);
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();

  const [formValues, setFormValues] = useState<EntryFormState>(buildInitialFormState);
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
    setReceiptFile(null);
    setReceiptPreview(null);
    setExistingImageUrl(null);
    setFormError(null);
    setPaymentMethodError(null);
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) {
      return existingImageUrl;
    }

    const fileExt = receiptFile.name.split(".").pop() ?? "jpg";
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from("receipts").upload(filePath, receiptFile, {
      cacheControl: "3600",
      upsert: true,
      contentType: receiptFile.type,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("receipts").getPublicUrl(filePath);
    return data.publicUrl;
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

      let uploadedUrl = existingImageUrl;
      if (receiptFile) {
        uploadedUrl = await uploadReceipt();
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
        image_url: uploadedUrl,
      };

      console.log("Saving entry payload", payload);

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
      });
      setExistingImageUrl(entry.image_url);
      setReceiptPreview(entry.image_url);
      setReceiptFile(null);
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

  const handleReceiptChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }
    const file = fileList[0];
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
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
    return entries
      .filter((entry) => {
        const entryDate = new Date(entry.entry_date);
        const fromDate = new Date(getDateRange.from);
        const toDate = new Date(getDateRange.to);

        // Set time to start/end of day for accurate comparison
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        entryDate.setHours(0, 0, 0, 0);

        return entryDate >= fromDate && entryDate <= toDate;
      })
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }, [entries, getDateRange]);

  const handleExportToExcel = () => {
    if (filteredEntries.length === 0) {
      alert("No entries to export for the selected date range.");
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

  return (
    <div className="flex flex-col gap-10 text-white">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Daily Entries</h1>
        <p className="text-sm text-slate-300">
          Record every inflow/outflow with supporting receipts to keep Donna in sync.
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
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
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

          <div className="space-y-2">
            <Label className="text-sm uppercase text-slate-400">Receipt / Image</Label>
            <div className="flex flex-col gap-4 rounded-xl border border-dashed border-[#a78bfa]/40 p-4">
              <label
                htmlFor="receipt-upload"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm transition hover:border-[#a78bfa]/80"
              >
                <UploadCloud className="h-5 w-5 text-[#a78bfa]" />
                <div>
                  <p className="font-medium">Upload receipt</p>
                  <p className="text-xs text-slate-400">PNG, JPG up to 5 MB</p>
                </div>
              </label>
              <Input
                id="receipt-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleReceiptChange(event.target.files)}
              />
              {(receiptPreview || existingImageUrl) && (
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptPreview || existingImageUrl || ""}
                    alt="Receipt preview"
                    className="h-16 w-16 rounded object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-300 hover:text-red-200"
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptPreview(null);
                      setExistingImageUrl(null);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              )}
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
                  : "Record Daily Entry"}
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
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Transaction History</h2>

          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Date:</span>
              <select
                value={dateFilter}
                onChange={handleDateFilterChange}
                className="px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-year">This Year</option>
                <option value="customize">Customize</option>
              </select>

              {/* Show calendar pickers when Customize is selected */}
              {showCustomDatePickers && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg text-sm text-white hover:bg-slate-700 focus:border-purple-500 focus:outline-none">
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

                  <span className="text-sm text-slate-400">to</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg text-sm text-white hover:bg-slate-700 focus:border-purple-500 focus:outline-none">
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
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>📥</span>
              <span>Export to Excel</span>
            </button>
          </div>
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
                <th className="px-3 py-2">Image</th>
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
                        entry.entry_type === "Cash Inflow" && "bg-emerald-500/20 text-emerald-300",
                        entry.entry_type === "Cash Outflow" && "bg-rose-500/20 text-rose-300",
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
                  <td className="px-3 py-3">
                    {entry.image_url ? (
                      <a
                        href={entry.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block rounded border border-white/10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.image_url}
                          alt="Receipt"
                          className="h-12 w-12 rounded object-cover"
                        />
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
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
