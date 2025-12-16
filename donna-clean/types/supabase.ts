export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      entries: {
        Row: {
          id: string
          user_id: string
          entry_type: string
          category: string
          payment_method: string
          amount: number
          remaining_amount: number | null
          settled_amount: number | null
          entry_date: string
          notes: string | null
          party_id: string | null
          settled: boolean
          settled_at: string | null
          is_settlement: boolean
          settlement_type: string | null
          original_entry_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_type: string
          category: string
          payment_method: string
          amount: number
          remaining_amount?: number | null
          settled_amount?: number | null
          entry_date: string
          notes?: string | null
          party_id?: string | null
          settled?: boolean
          settled_at?: string | null
          is_settlement?: boolean
          settlement_type?: string | null
          original_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_type?: string
          category?: string
          payment_method?: string
          amount?: number
          remaining_amount?: number | null
          settled_amount?: number | null
          entry_date?: string
          notes?: string | null
          party_id?: string | null
          settled?: boolean
          settled_at?: string | null
          is_settlement?: boolean
          settlement_type?: string | null
          original_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      parties: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          business_name: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          business_name?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          type: string
          priority: number
          title: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          priority?: number
          title: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          priority?: number
          title?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          due_date: string
          status: string
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          due_date: string
          status?: string
          category: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string
          status?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
      settlement_history: {
        Row: {
          id: string
          user_id: string
          original_entry_id: string
          settlement_entry_id: string
          amount_settled: number
          settlement_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_entry_id: string
          settlement_entry_id: string
          amount_settled: number
          settlement_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_entry_id?: string
          settlement_entry_id?: string
          amount_settled?: number
          settlement_date?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      settle_entry: {
        Args: {
          p_entry_id: string
          p_user_id: string
          p_settlement_amount: number
          p_settlement_date: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
