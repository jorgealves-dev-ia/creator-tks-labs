/**
 * Types mirroring supabase/migrations/.
 *
 * Hand-authored so the app can be typed before the migrations are applied.
 * Once they are applied, regenerate this file to pick up the real relationship
 * metadata and to prove there is no drift:
 *
 *   supabase gen types typescript --db-url "<connection string>" \
 *     > src/lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          user_id: string;
          balance_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          status: Database["public"]["Enums"]["project_status"];
          sort_order: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          status?: Database["public"]["Enums"]["project_status"];
          sort_order?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["project_status"];
          sort_order?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflows: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          graph: Json;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          graph?: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          graph?: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          user_id: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          source: Database["public"]["Enums"]["asset_source"];
          storage_bucket: string;
          storage_path: string;
          mime_type: string;
          byte_size: number | null;
          width: number | null;
          height: number | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          source: Database["public"]["Enums"]["asset_source"];
          storage_bucket?: string;
          storage_path: string;
          mime_type: string;
          byte_size?: number | null;
          width?: number | null;
          height?: number | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          source?: Database["public"]["Enums"]["asset_source"];
          storage_bucket?: string;
          storage_path?: string;
          mime_type?: string;
          byte_size?: number | null;
          width?: number | null;
          height?: number | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      entities: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          kind: Database["public"]["Enums"]["entity_kind"];
          handle: string;
          display_name: string;
          sheet: Json;
          version: number;
          cover_asset_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          kind: Database["public"]["Enums"]["entity_kind"];
          handle: string;
          display_name: string;
          sheet?: Json;
          version?: number;
          cover_asset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          kind?: Database["public"]["Enums"]["entity_kind"];
          handle?: string;
          display_name?: string;
          sheet?: Json;
          version?: number;
          cover_asset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      entity_images: {
        Row: {
          entity_id: string;
          asset_id: string;
          user_id: string;
          role: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          entity_id: string;
          asset_id: string;
          user_id: string;
          role?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          entity_id?: string;
          asset_id?: string;
          user_id?: string;
          role?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          workflow_id: string | null;
          node_id: string | null;
          provider: string;
          model: string;
          params: Json;
          prompt_user_pt: string | null;
          prompt_compiled: Json | null;
          status: Database["public"]["Enums"]["generation_status"];
          provider_job_id: string | null;
          cost_real_cents: number;
          cost_charged_cents: number;
          result_asset_id: string | null;
          error: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          workflow_id?: string | null;
          node_id?: string | null;
          provider: string;
          model: string;
          params?: Json;
          prompt_user_pt?: string | null;
          prompt_compiled?: Json | null;
          status?: Database["public"]["Enums"]["generation_status"];
          provider_job_id?: string | null;
          cost_real_cents?: number;
          cost_charged_cents?: number;
          result_asset_id?: string | null;
          error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          workflow_id?: string | null;
          node_id?: string | null;
          provider?: string;
          model?: string;
          params?: Json;
          prompt_user_pt?: string | null;
          prompt_compiled?: Json | null;
          status?: Database["public"]["Enums"]["generation_status"];
          provider_job_id?: string | null;
          cost_real_cents?: number;
          cost_charged_cents?: number;
          result_asset_id?: string | null;
          error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ledger_transactions: {
        Row: {
          id: string;
          user_id: string;
          kind: Database["public"]["Enums"]["ledger_kind"];
          amount_cents: number;
          cost_real_cents: number | null;
          cost_charged_cents: number | null;
          generation_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: Database["public"]["Enums"]["ledger_kind"];
          amount_cents: number;
          cost_real_cents?: number | null;
          cost_charged_cents?: number | null;
          generation_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      asset_kind: "image" | "video" | "audio";
      asset_source: "upload" | "generation";
      entity_kind:
        | "character"
        | "product"
        | "scene"
        | "outfit"
        | "accessory";
      generation_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "canceled";
      ledger_kind: "deposit" | "debit" | "refund" | "adjustment";
      project_status: "idle" | "generating" | "generated" | "error";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
