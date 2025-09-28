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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          first_name: string
          has_access: boolean
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_by: string | null
          last_name: string
          phone_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          first_name: string
          has_access?: boolean
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          last_name: string
          phone_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          has_access?: boolean
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          last_name?: string
          phone_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      demo_responses: {
        Row: {
          answer_text: string
          carrier_name: string | null
          created_at: string
          id: string
          question_text: string
          updated_at: string
        }
        Insert: {
          answer_text: string
          carrier_name?: string | null
          created_at?: string
          id?: string
          question_text: string
          updated_at?: string
        }
        Update: {
          answer_text?: string
          carrier_name?: string | null
          created_at?: string
          id?: string
          question_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_content: {
        Row: {
          content_summary: string | null
          content_text: string
          created_at: string
          extracted_at: string
          file_id: string
          id: string
          processing_status: string
          updated_at: string
        }
        Insert: {
          content_summary?: string | null
          content_text: string
          created_at?: string
          extracted_at?: string
          file_id: string
          id?: string
          processing_status?: string
          updated_at?: string
        }
        Update: {
          content_summary?: string | null
          content_text?: string
          created_at?: string
          extracted_at?: string
          file_id?: string
          id?: string
          processing_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_content_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "document_files"
            referencedColumns: ["id"]
          },
        ]
      }
      document_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          folder_id: string
          has_content: boolean | null
          id: string
          organization_id: string | null
          processing_status: string | null
          source: string
          ttl_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder_id: string
          has_content?: boolean | null
          id?: string
          organization_id?: string | null
          processing_status?: string | null
          source?: string
          ttl_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string
          has_content?: boolean | null
          id?: string
          organization_id?: string | null
          processing_status?: string | null
          source?: string
          ttl_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_hidden: boolean
          name: string
          openai_instructions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_hidden?: boolean
          name: string
          openai_instructions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_hidden?: boolean
          name?: string
          openai_instructions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component: string | null
          created_at: string | null
          id: string
          level: Database["public"]["Enums"]["error_level"]
          message: string
          metadata: Json | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string | null
          id?: string
          level: Database["public"]["Enums"]["error_level"]
          message: string
          metadata?: Json | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["error_level"]
          message?: string
          metadata?: Json | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          monthly_query_cap: number
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          monthly_query_cap?: number
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          monthly_query_cap?: number
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      queries: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          query_text: string | null
          response_text: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          query_text?: string | null
          response_text?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          query_text?: string | null
          response_text?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_add_ons: {
        Row: {
          add_on_type: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          quantity: number
          status: string
          stripe_price_id: string
          stripe_subscription_id: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          add_on_type: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          quantity?: number
          status?: string
          stripe_price_id: string
          stripe_subscription_id: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          add_on_type?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          quantity?: number
          status?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          additional_storage_gb: number | null
          additional_storage_subscription_ids: string[] | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          intro_cycles_remaining: number | null
          intro_end_date: string | null
          intro_period_active: boolean | null
          intro_price_id: string | null
          plan_type: string | null
          queries_reset_at: string | null
          queries_used: number | null
          query_limit: number | null
          standard_price_id: string | null
          status: string
          storage_limit_gb: number | null
          storage_used_gb: number | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_storage_gb?: number | null
          additional_storage_subscription_ids?: string[] | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          intro_cycles_remaining?: number | null
          intro_end_date?: string | null
          intro_period_active?: boolean | null
          intro_price_id?: string | null
          plan_type?: string | null
          queries_reset_at?: string | null
          queries_used?: number | null
          query_limit?: number | null
          standard_price_id?: string | null
          status?: string
          storage_limit_gb?: number | null
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_storage_gb?: number | null
          additional_storage_subscription_ids?: string[] | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          intro_cycles_remaining?: number | null
          intro_end_date?: string | null
          intro_period_active?: boolean | null
          intro_price_id?: string | null
          plan_type?: string | null
          queries_reset_at?: string | null
          queries_used?: number | null
          query_limit?: number | null
          standard_price_id?: string | null
          status?: string
          storage_limit_gb?: number | null
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_month_query_count: {
        Args: { p_org: string }
        Returns: number
      }
      generate_invite_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_total_storage_limit: {
        Args: { p_user_id: string }
        Returns: number
      }
      has_active_subscription_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reset_monthly_queries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_demo_documents: {
        Args: { p_limit?: number; p_search_query: string }
        Returns: {
          category_name: string
          content_snippet: string
          file_id: string
          file_name: string
          folder_name: string
          relevance_score: number
        }[]
      }
      search_user_documents: {
        Args: { p_limit?: number; p_search_query: string; p_user_id: string }
        Returns: {
          category_name: string
          content_snippet: string
          file_id: string
          file_name: string
          folder_name: string
          relevance_score: number
        }[]
      }
      update_organization_query_cap: {
        Args: { p_org_id: string; p_plan_type: string }
        Returns: undefined
      }
    }
    Enums: {
      error_level: "info" | "warning" | "error" | "critical"
      user_role: "admin" | "user"
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
      error_level: ["info", "warning", "error", "critical"],
      user_role: ["admin", "user"],
    },
  },
} as const