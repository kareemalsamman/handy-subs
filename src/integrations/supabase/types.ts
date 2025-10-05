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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      domains: {
        Row: {
          created_at: string
          domain_url: string
          id: string
          last_checked: string | null
          plugins_updates_count: number | null
          themes_updates_count: number | null
          user_id: string
          wordpress_admin_url: string | null
          wordpress_secret_key: string | null
          wordpress_update_available: boolean | null
        }
        Insert: {
          created_at?: string
          domain_url: string
          id?: string
          last_checked?: string | null
          plugins_updates_count?: number | null
          themes_updates_count?: number | null
          user_id: string
          wordpress_admin_url?: string | null
          wordpress_secret_key?: string | null
          wordpress_update_available?: boolean | null
        }
        Update: {
          created_at?: string
          domain_url?: string
          id?: string
          last_checked?: string | null
          plugins_updates_count?: number | null
          themes_updates_count?: number | null
          user_id?: string
          wordpress_admin_url?: string | null
          wordpress_secret_key?: string | null
          wordpress_update_available?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          admin_phone: string
          auto_messages_enabled: boolean | null
          auto_wordpress_updates_enabled: boolean | null
          id: string
          server_monthly_cost: number
          sms_source: string | null
          sms_token: string | null
          sms_username: string | null
          wordpress_update_schedule: string | null
        }
        Insert: {
          admin_phone?: string
          auto_messages_enabled?: boolean | null
          auto_wordpress_updates_enabled?: boolean | null
          id?: string
          server_monthly_cost?: number
          sms_source?: string | null
          sms_token?: string | null
          sms_username?: string | null
          wordpress_update_schedule?: string | null
        }
        Update: {
          admin_phone?: string
          auto_messages_enabled?: boolean | null
          auto_wordpress_updates_enabled?: boolean | null
          id?: string
          server_monthly_cost?: number
          sms_source?: string | null
          sms_token?: string | null
          sms_username?: string | null
          wordpress_update_schedule?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          id: string
          message: string
          phone_number: string
          response: string | null
          sent_at: string
          status: Database["public"]["Enums"]["sms_status"]
        }
        Insert: {
          id?: string
          message: string
          phone_number: string
          response?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["sms_status"]
        }
        Update: {
          id?: string
          message?: string
          phone_number?: string
          response?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["sms_status"]
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          begin_date: string
          buy_domain: boolean
          c_cost: number
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          domain_cost: number | null
          domain_id: string
          expire_date: string | null
          id: string
          one_month_reminder_sent: boolean
          one_week_reminder_sent: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          begin_date: string
          buy_domain?: boolean
          c_cost: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          domain_cost?: number | null
          domain_id: string
          expire_date?: string | null
          id?: string
          one_month_reminder_sent?: boolean
          one_week_reminder_sent?: boolean
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          begin_date?: string
          buy_domain?: boolean
          c_cost?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          domain_cost?: number | null
          domain_id?: string
          expire_date?: string | null
          id?: string
          one_month_reminder_sent?: boolean
          one_week_reminder_sent?: boolean
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          company: Database["public"]["Enums"]["company_type"]
          created_at: string
          id: string
          phone_number: string
          updated_at: string
          username: string
        }
        Insert: {
          company: Database["public"]["Enums"]["company_type"]
          created_at?: string
          id?: string
          phone_number: string
          updated_at?: string
          username: string
        }
        Update: {
          company?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          id?: string
          phone_number?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      wordpress_update_logs: {
        Row: {
          created_at: string
          details: string | null
          domain_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          domain_id: string
          id?: string
          status: string
        }
        Update: {
          created_at?: string
          details?: string | null
          domain_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_update_logs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_monthly_cost_per_user: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_subscription_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      company_type: "Ajad" | "Soft" | "Spex" | "Almas" | "Others"
      notification_type:
        | "sms_reminder"
        | "payment_received"
        | "subscription_cancelled"
        | "subscription_expiring"
        | "system_alert"
      sms_status: "success" | "failed" | "pending"
      subscription_status: "active" | "expired" | "cancelled" | "done"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      company_type: ["Ajad", "Soft", "Spex", "Almas", "Others"],
      notification_type: [
        "sms_reminder",
        "payment_received",
        "subscription_cancelled",
        "subscription_expiring",
        "system_alert",
      ],
      sms_status: ["success", "failed", "pending"],
      subscription_status: ["active", "expired", "cancelled", "done"],
    },
  },
} as const
