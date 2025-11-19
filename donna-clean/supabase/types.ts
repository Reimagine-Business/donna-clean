// lib/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      entries: {
        Row: {
          id: string
          user_id: string
          notes: string | null
          created_at: string
          payment_method: string
          image_url: string | null
          entry_type: string
          category: string
          amount: string
          entry_date: string
          remaining_amount: string | null
          settled: boolean | null
          settled_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          notes?: string | null
          created_at?: string
          payment_method?: string
          image_url?: string | null
          entry_type?: string
          category?: string
          amount?: string
          entry_date?: string
          remaining_amount?: string | null
          settled?: boolean | null
          settled_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          notes?: string | null
          created_at?: string
          payment_method?: string
          image_url?: string | null
          entry_type?: string
          category?: string
          amount?: string
          entry_date?: string
          remaining_amount?: string | null
          settled?: boolean | null
          settled_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          email: string | null
          business_name: string | null
          role: string | null
          trial_ends_at: string | null
        }
        Insert: {
          id: string
          created_at?: string | null
          updated_at?: string | null
          email?: string | null
          business_name?: string | null
          role?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          email?: string | null
          business_name?: string | null
          role?: string | null
          trial_ends_at?: string | null
        }
      }
    }
  }
}
