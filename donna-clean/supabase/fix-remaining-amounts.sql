-- One-time helper: run `psql -f supabase/fix-remaining-amounts.sql "$DATABASE_URL"` to backfill missing remaining_amount values.
update public.entries
set remaining_amount = amount
where entry_type in ('Credit', 'Advance')
  and (remaining_amount is null or remaining_amount = 0);
