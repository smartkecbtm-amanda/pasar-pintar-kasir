export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_chain: {
        Row: {
          entity_id: string
          hash: string
          prev_hash: string
          seq: number
          store_id: string
        }
        Insert: {
          entity_id: string
          hash: string
          prev_hash: string
          seq: number
          store_id: string
        }
        Update: {
          entity_id?: string
          hash?: string
          prev_hash?: string
          seq?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_chain_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pins: {
        Row: {
          employee_id: string
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
          store_id: string
        }
        Insert: {
          employee_id: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
          store_id: string
        }
        Update: {
          employee_id?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_pins_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          order_id: string
          paid_at: string | null
          provider: string
          qr_string: string | null
          qr_url: string | null
          raw: Json | null
          status: string
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          provider: string
          qr_string?: string | null
          qr_url?: string | null
          raw?: Json | null
          status?: string
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          provider?: string
          qr_string?: string | null
          qr_url?: string | null
          raw?: Json | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ppob_orders: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string | null
          price: number | null
          provider: string
          raw: Json | null
          ref_id: string
          sku: string
          sn: string | null
          status: string
          store_id: string
          target: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message?: string | null
          price?: number | null
          provider: string
          raw?: Json | null
          ref_id: string
          sku: string
          sn?: string | null
          status?: string
          store_id: string
          target: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          price?: number | null
          provider?: string
          raw?: Json | null
          ref_id?: string
          sku?: string
          sn?: string | null
          status?: string
          store_id?: string
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppob_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      sync_entities: {
        Row: {
          data: Json | null
          deleted: boolean
          entity: string
          entity_id: string
          seq: number
          store_id: string
          ts: number
        }
        Insert: {
          data?: Json | null
          deleted?: boolean
          entity: string
          entity_id: string
          seq?: number
          store_id: string
          ts: number
        }
        Update: {
          data?: Json | null
          deleted?: boolean
          entity?: string
          entity_id?: string
          seq?: number
          store_id?: string
          ts?: number
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_events: {
        Row: {
          id: string
          received_at: string
          store_id: string
        }
        Insert: {
          id: string
          received_at?: string
          store_id: string
        }
        Update: {
          id?: string
          received_at?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          data: Json
          from_store: string
          id: string
          status: string
          to_store: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: Json
          from_store: string
          id: string
          status?: string
          to_store: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          from_store?: string
          id?: string
          status?: string
          to_store?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_store_fkey"
            columns: ["from_store"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_fkey"
            columns: ["to_store"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_cash_moves: {
        Row: {
          amount: number | null
          id: string | null
          kind: string | null
          moved_at: string | null
          note: string | null
          shift_id: string | null
          store_id: string | null
        }
        Insert: {
          amount?: never
          id?: string | null
          kind?: never
          moved_at?: never
          note?: never
          shift_id?: never
          store_id?: string | null
        }
        Update: {
          amount?: never
          id?: string | null
          kind?: never
          moved_at?: never
          note?: never
          shift_id?: never
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_balance: {
        Row: {
          balance: number | null
          customer_id: string | null
          store_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_sales: {
        Row: {
          day: string | null
          revenue: number | null
          store_id: string | null
          transactions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_products: {
        Row: {
          barcode: string | null
          base_unit: string | null
          category: string | null
          hpp: number | null
          id: string | null
          min_stock: number | null
          name: string | null
          stock: number | null
          store_id: string | null
        }
        Insert: {
          barcode?: never
          base_unit?: never
          category?: never
          hpp?: never
          id?: string | null
          min_stock?: never
          name?: never
          stock?: never
          store_id?: string | null
        }
        Update: {
          barcode?: never
          base_unit?: never
          category?: never
          hpp?: never
          id?: string | null
          min_stock?: never
          name?: never
          stock?: never
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sale_items: {
        Row: {
          factor: number | null
          hpp: number | null
          name: string | null
          price: number | null
          product_id: string | null
          qty: number | null
          sale_id: string | null
          store_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sales: {
        Row: {
          cashier: string | null
          id: string | null
          manual_discount: number | null
          method: string | null
          sold_at: string | null
          store_id: string | null
          total: number | null
          voided: boolean | null
        }
        Insert: {
          cashier?: never
          id?: string | null
          manual_discount?: never
          method?: never
          sold_at?: never
          store_id?: string | null
          total?: never
          voided?: never
        }
        Update: {
          cashier?: never
          id?: string | null
          manual_discount?: never
          method?: never
          sold_at?: never
          store_id?: string | null
          total?: never
          voided?: never
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_moves: {
        Row: {
          audit_flag: boolean | null
          id: string | null
          moved_at: string | null
          product_id: string | null
          qty: number | null
          reason: string | null
          store_id: string | null
        }
        Insert: {
          audit_flag?: never
          id?: string | null
          moved_at?: never
          product_id?: never
          qty?: never
          reason?: never
          store_id?: string | null
        }
        Update: {
          audit_flag?: never
          id?: string | null
          moved_at?: never
          product_id?: never
          qty?: never
          reason?: never
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_device_member: {
        Args: { p_email: string; p_store: string }
        Returns: undefined
      }
      cancel_transfer: {
        Args: { p_id: string; p_store: string }
        Returns: boolean
      }
      create_store: { Args: { p_name: string }; Returns: string }
      create_transfer: { Args: { p_transfer: Json }; Returns: undefined }
      is_member: { Args: { p_store: string }; Returns: boolean }
      is_owner: { Args: { p_store: string }; Returns: boolean }
      list_group_stores: { Args: { p_store: string }; Returns: Json }
      list_transfers: { Args: { p_store: string }; Returns: Json }
      receive_transfer: {
        Args: { p_id: string; p_store: string }
        Returns: boolean
      }
      set_employee_pin: {
        Args: { p_employee: string; p_pin: string; p_store: string }
        Returns: undefined
      }
      sync_pull: {
        Args: { p_limit?: number; p_since: number; p_store: string }
        Returns: Json
      }
      sync_push: { Args: { p_events: Json; p_store: string }; Returns: Json }
      sync_status: { Args: { p_store: string }; Returns: Json }
      verify_employee_pin: {
        Args: { p_employee: string; p_pin: string; p_store: string }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
