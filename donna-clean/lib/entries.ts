import { format } from "date-fns";

export const ENTRY_TYPES = ["Cash IN", "Cash OUT", "Credit", "Advance"] as const;
export const CATEGORIES = ["Sales", "COGS", "Opex", "Assets"] as const;
export const PAYMENT_METHODS = ["Cash", "Bank"] as const;

const PAYMENT_METHOD_OPTIONS = [...PAYMENT_METHODS, "None"] as const;

export const CASH_FLOW_ENTRY_TYPES = ["Cash IN", "Cash OUT"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type CategoryType = (typeof CATEGORIES)[number];
export type CashPaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number];
export type CashFlowEntryType = (typeof CASH_FLOW_ENTRY_TYPES)[number];

export const deriveEntryTypeFromCategory = (category: CategoryType): EntryType =>
  category === "Sales" ? "Cash IN" : "Cash OUT";

export const isCashFlowEntryType = (entryType: EntryType): entryType is CashFlowEntryType =>
  CASH_FLOW_ENTRY_TYPES.includes(entryType as CashFlowEntryType);

export const resolveEntryType = (entryType: EntryType, category: CategoryType): EntryType => {
  if (!isCashFlowEntryType(entryType)) {
    return entryType;
  }
  return deriveEntryTypeFromCategory(category);
};

export type Entry = {
  id: string;
  user_id: string;
  entry_type: EntryType;
  category: CategoryType;
  payment_method: PaymentMethod;
  amount: number;
  remaining_amount: number;
  entry_date: string;
  notes: string | null;
  image_url: string | null;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EntryRecord = Omit<Entry, "amount" | "remaining_amount" | "settled" | "settled_at"> & {
  amount: number | string;
  remaining_amount: number | string | null;
  settled: boolean;
  settled_at: string | null;
};

export type SupabaseEntry = Partial<EntryRecord> & {
  amount?: number | string | null;
  remaining_amount?: number | string | null;
  settled?: boolean | null;
  settled_at?: string | null;
};

const ensureOption = <const T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number],
): T[number] => {
  return options.includes(value as T[number]) ? (value as T[number]) : fallback;
};

export const normalizeEntry = (entry: SupabaseEntry): Entry => {
  const amount = typeof entry.amount === "number" ? entry.amount : Number(entry.amount ?? 0);
  const remaining =
    typeof entry.remaining_amount === "number"
      ? entry.remaining_amount
      : Number(entry.remaining_amount ?? amount);

  const fallbackDate = format(new Date(), "yyyy-MM-dd");

  const safeId =
    typeof entry.id === "string" && entry.id.length > 0
      ? entry.id
      : globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;

  return {
    id: safeId,
    user_id: entry.user_id ?? "",
    entry_type: ensureOption(entry.entry_type, ENTRY_TYPES, ENTRY_TYPES[0]),
    category: ensureOption(entry.category, CATEGORIES, CATEGORIES[0]),
    payment_method: ensureOption(
      entry.payment_method,
      PAYMENT_METHOD_OPTIONS,
      PAYMENT_METHOD_OPTIONS[0],
    ),
    amount: Number.isFinite(amount) ? amount : 0,
    remaining_amount: Number.isFinite(remaining) ? remaining : Number.isFinite(amount) ? amount : 0,
    entry_date: entry.entry_date ?? fallbackDate,
    notes: entry.notes ?? null,
    image_url: entry.image_url ?? null,
    settled: Boolean(entry.settled),
    settled_at: entry.settled_at ?? null,
    created_at: entry.created_at ?? new Date().toISOString(),
    updated_at: entry.updated_at ?? new Date().toISOString(),
  };
};
