"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Download, Edit3, Trash2, UploadCloud, X, Handshake } from "lucide-react";

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
import { SettleEntryDialog } from "@/components/settlement/settle-entry-dialog";
import { addEntry as addEntryAction } from "@/app/daily-entries/actions";

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
const CASH_REQUIRED_ENTRY_TYPES: EntryType[] = ["Cash Inflow", "Cash Outflow", "Advance"];

const buildInitialFormState = (): EntryFormState => ({
  entry_type: ENTRY_TYPES[0],
  category: CATEGORIES[0],
  payment_method: PAYMENT_METHODS[0],
  amount: "",
  entry_date: today,
  notes: "",
});

const buildInitialFiltersState = (): FiltersState => ({
  entry_type: "All",
  category: "All",
  payment_method: "All",
  start_date: defaultStart,
  end_date: today,
  search: "",
});

export function DailyEntriesShell({ initialEntries, userId }: DailyEntriesShellProps) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<EntryFormState>(buildInitialFormState);
  const [filters, setFilters] = useState<FiltersState>(buildInitialFiltersState);
  const [settlementEntry, setSettlementEntry] = useState<Entry | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const currentEntryType = formValues.entry_type;

    useEffect(() => {
      setFormValues((prev) => {
        if (prev.entry_type === "Credit" && prev.payment_method !== "None") {
          return { ...prev, payment_method: "None" };
        }
        return prev;
      });

      const requiresCashChannel = CASH_REQUIRED_ENTRY_TYPES.includes(currentEntryType);
      setFormError((prev) => {
        if (requiresCashChannel && formValues.payment_method === "None") {
          return "Payment method required for cash movement";
        }
        if (prev === "Payment method required for cash movement") {
          return null;
        }
        return prev;
      });
    }, [currentEntryType, formValues.payment_method]);

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
      const isCreditSelection = selectedEntryType === "Credit";
      const requiresCashChannel = CASH_REQUIRED_ENTRY_TYPES.includes(selectedEntryType);

      if (isCreditSelection && paymentMethod !== "None") {
        setFormError('Credit entries must use "None" for payment method.');
        setIsSubmitting(false);
        return;
      }

      if (requiresCashChannel && paymentMethod === "None") {
        setFormError('Cash and Advance entries must use "Cash" or "Bank" as the payment method.');
        setIsSubmitting(false);
        return;
      }

      let uploadedUrl = existingImageUrl;
      if (receiptFile) {
        uploadedUrl = await uploadReceipt();
      }

      const payload = {
        entry_type: selectedEntryType,
        category: formValues.category,
        payment_method: paymentMethod,
        amount: numericAmount,
        entry_date: formValues.entry_date,
        notes: formValues.notes || null,
        image_url: uploadedUrl,
      };

      console.log("Saving entry payload", payload);

      if (editingEntryId) {
        const { error } = await supabase.from("entries").update(payload).eq("id", editingEntryId);
        if (error) throw error;
        setSuccessMessage("Entry updated!");
      } else {
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
      setFormValues({
        entry_type: entry.entry_type,
        category: entry.category,
        payment_method: entry.payment_method,
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
    await supabase.from("entries").delete().eq("id", entryId);
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
      "Image URL",
    ];
    const rows = filteredEntries.map((entry) => [
      entry.entry_date,
      entry.entry_type,
      entry.category,
      entry.payment_method,
      entry.amount.toString(),
      entry.notes?.replace(/"/g, '""') ?? "",
      entry.image_url ?? "",
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

  return (
    <div className="flex flex-col gap-10 text-white">
      <div className="space-y-4">
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
                disabled={currentEntryType === "Credit"}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]",
                  currentEntryType === "Credit"
                    ? "cursor-not-allowed border-white/5 bg-slate-900/60 text-slate-500"
                    : "border-white/10 bg-slate-950/80",
                )}
              >
                {currentEntryType === "Credit" ? (
                  <option value="None" disabled>
                    None (credit entry)
                  </option>
                ) : (
                  PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))
                )}
              </select>
              {currentEntryType === "Credit" ? (
                <p className="text-xs text-slate-500">Credit entries settle later, so payment is tracked as None.</p>
              ) : (
                <p className="text-xs text-slate-500">Use Cash or Bank for live cash movement; None is reserved for Credit.</p>
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
