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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      deals: {
        Row: {
          created_at: string | null
          everflow_event_status: string | null
          home_value: number
          id: string
          max_investment: number
          mortgage_balance: number
          offer_link: string | null
          owner_names: string[] | null
          property_address: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          everflow_event_status?: string | null
          home_value: number
          id?: string
          max_investment: number
          mortgage_balance: number
          offer_link?: string | null
          owner_names?: string[] | null
          property_address: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          everflow_event_status?: string | null
          home_value?: number
          id?: string
          max_investment?: number
          mortgage_balance?: number
          offer_link?: string | null
          owner_names?: string[] | null
          property_address?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_completed: boolean | null
          cell_phone: string | null
          company_name: string | null
          company_url: string | null
          created_at: string | null
          email: string
          everflow_account_status: string | null
          everflow_api_key: string | null
          everflow_encoded_value: string | null
          everflow_id: string | null
          everflow_network_id: number | null
          everflow_tracking_domain: string | null
          everflow_user_id: number | null
          full_name: string | null
          avatar_url: string | null
          id: string
          invite_token: string | null
          paperwork_completed: boolean | null
          parent_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string | null
        }
        Insert: {
          billing_completed?: boolean | null
          cell_phone?: string | null
          company_name?: string | null
          company_url?: string | null
          created_at?: string | null
          email: string
          everflow_account_status?: string | null
          everflow_api_key?: string | null
          everflow_encoded_value?: string | null
          everflow_id?: string | null
          everflow_network_id?: number | null
          everflow_tracking_domain?: string | null
          everflow_user_id?: number | null
          full_name?: string | null
          avatar_url?: string | null
          id: string
          invite_token?: string | null
          paperwork_completed?: boolean | null
          parent_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
        }
        Update: {
          billing_completed?: boolean | null
          cell_phone?: string | null
          company_name?: string | null
          company_url?: string | null
          created_at?: string | null
          email?: string
          everflow_account_status?: string | null
          everflow_api_key?: string | null
          everflow_encoded_value?: string | null
          everflow_id?: string | null
          everflow_network_id?: number | null
          everflow_tracking_domain?: string | null
          everflow_user_id?: number | null
          full_name?: string | null
          avatar_url?: string | null
          id?: string
          invite_token?: string | null
          paperwork_completed?: boolean | null
          parent_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      },
      bulk_import_batches: {
        Row: {
          id: string
          user_id: string
          created_at: string
          total_count: number
          completed_count: number
          success_count: number
          failed_count: number
          status: 'processing' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          total_count?: number
          completed_count?: number
          success_count?: number
          failed_count?: number
          status?: 'processing' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          total_count?: number
          completed_count?: number
          success_count?: number
          failed_count?: number
          status?: 'processing' | 'completed' | 'failed'
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      bulk_import_items: {
        Row: {
          id: string
          batch_id: string
          original_address: string
          status: 'pending' | 'processing' | 'success' | 'failed'
          result_message: string | null
          deal_id: string | null
          offer_link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          original_address: string
          status?: 'pending' | 'processing' | 'success' | 'failed'
          result_message?: string | null
          deal_id?: string | null
          offer_link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          original_address?: string
          status?: 'pending' | 'processing' | 'success' | 'failed'
          result_message?: string | null
          deal_id?: string | null
          offer_link?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bulk_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_import_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          }
        ]
      },
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          platform: string
          description: string | null
          offer_link: string
          is_active: boolean
          total_clicks: number
          application_created: number
          application_qualified: number
          estimate_prepared: number
          application_completed: number
          underwriting_submitted: number
          review_requested: number
          final_offer_presented: number
          funds_disbursed: number
          closed_lost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          platform: string
          description?: string | null
          offer_link: string
          is_active?: boolean
          total_clicks?: number
          application_created?: number
          application_qualified?: number
          estimate_prepared?: number
          application_completed?: number
          underwriting_submitted?: number
          review_requested?: number
          final_offer_presented?: number
          funds_disbursed?: number
          closed_lost?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          platform?: string
          description?: string | null
          offer_link?: string
          is_active?: boolean
          total_clicks?: number
          application_created?: number
          application_qualified?: number
          estimate_prepared?: number
          application_completed?: number
          underwriting_submitted?: number
          review_requested?: number
          final_offer_presented?: number
          funds_disbursed?: number
          closed_lost?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
      user_role: "manager" | "officer"
      user_status: "pending" | "active" | "denied"
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
      app_role: ["admin"],
      user_role: ["manager", "officer"],
      user_status: ["pending", "active", "denied"],
    },
  },
} as const
