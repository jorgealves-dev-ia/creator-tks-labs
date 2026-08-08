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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          byte_size: number | null
          created_at: string
          duration_ms: number | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type: string
          source: Database["public"]["Enums"]["asset_source"]
          storage_bucket: string
          storage_path: string
          user_id: string
          width: number | null
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type: string
          source: Database["public"]["Enums"]["asset_source"]
          storage_bucket?: string
          storage_path: string
          user_id: string
          width?: number | null
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string
          source?: Database["public"]["Enums"]["asset_source"]
          storage_bucket?: string
          storage_path?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      entities: {
        Row: {
          active_version_id: string | null
          archived_at: string | null
          cover_asset_id: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          kind: Database["public"]["Enums"]["entity_kind"]
          project_id: string | null
          sheet: Json
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          active_version_id?: string | null
          archived_at?: string | null
          cover_asset_id?: string | null
          created_at?: string
          display_name: string
          handle: string
          id?: string
          kind: Database["public"]["Enums"]["entity_kind"]
          project_id?: string | null
          sheet?: Json
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          active_version_id?: string | null
          archived_at?: string | null
          cover_asset_id?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          kind?: Database["public"]["Enums"]["entity_kind"]
          project_id?: string | null
          sheet?: Json
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "entities_active_version_belongs_to_entity"
            columns: ["active_version_id", "id"]
            isOneToOne: false
            referencedRelation: "entity_versions"
            referencedColumns: ["id", "entity_id"]
          },
          {
            foreignKeyName: "entities_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_images: {
        Row: {
          asset_id: string
          created_at: string
          entity_id: string
          role: string | null
          sort_order: number
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          entity_id: string
          role?: string | null
          sort_order?: number
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          entity_id?: string
          role?: string | null
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_images_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_images_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_versions: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          label: string | null
          sheet: Json
          user_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          label?: string | null
          sheet: Json
          user_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          label?: string | null
          sheet?: Json
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "entity_versions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          completed_at: string | null
          cost_charged_cents: number
          cost_real_cents: number
          created_at: string
          entity_version_id: string | null
          error: string | null
          id: string
          model: string
          node_id: string | null
          params: Json
          project_id: string | null
          prompt_compiled: Json | null
          prompt_user_pt: string | null
          provider: string
          provider_job_id: string | null
          result_asset_id: string | null
          sheet_source: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["generation_status"]
          updated_at: string
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          cost_charged_cents?: number
          cost_real_cents?: number
          created_at?: string
          entity_version_id?: string | null
          error?: string | null
          id?: string
          model: string
          node_id?: string | null
          params?: Json
          project_id?: string | null
          prompt_compiled?: Json | null
          prompt_user_pt?: string | null
          provider: string
          provider_job_id?: string | null
          result_asset_id?: string | null
          sheet_source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          updated_at?: string
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          cost_charged_cents?: number
          cost_real_cents?: number
          created_at?: string
          entity_version_id?: string | null
          error?: string | null
          id?: string
          model?: string
          node_id?: string | null
          params?: Json
          project_id?: string | null
          prompt_compiled?: Json | null
          prompt_user_pt?: string | null
          provider?: string
          provider_job_id?: string | null
          result_asset_id?: string | null
          sheet_source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          updated_at?: string
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generations_entity_version_id_fkey"
            columns: ["entity_version_id"]
            isOneToOne: false
            referencedRelation: "entity_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_result_asset_id_fkey"
            columns: ["result_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          amount_cents: number
          cost_charged_cents: number | null
          cost_real_cents: number | null
          created_at: string
          description: string | null
          generation_id: string | null
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          cost_charged_cents?: number | null
          cost_real_cents?: number | null
          created_at?: string
          description?: string | null
          generation_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          cost_charged_cents?: number | null
          cost_real_cents?: number | null
          created_at?: string
          description?: string | null
          generation_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_cents: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string
          graph: Json
          id: string
          project_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          graph?: Json
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          graph?: Json
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asset_kind: "image" | "video" | "audio"
      asset_source: "upload" | "generation"
      entity_kind: "character" | "product" | "scene" | "outfit" | "accessory"
      generation_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "canceled"
      ledger_kind: "deposit" | "debit" | "refund" | "adjustment"
      project_status: "idle" | "generating" | "generated" | "error"
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
      asset_kind: ["image", "video", "audio"],
      asset_source: ["upload", "generation"],
      entity_kind: ["character", "product", "scene", "outfit", "accessory"],
      generation_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "canceled",
      ],
      ledger_kind: ["deposit", "debit", "refund", "adjustment"],
      project_status: ["idle", "generating", "generated", "error"],
    },
  },
} as const
