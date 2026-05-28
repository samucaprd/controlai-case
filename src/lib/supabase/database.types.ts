export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "master" | "admin" | "user";

export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: {
          id: string;
          empresa_id: number;
          role: AppRole;
          email: string;
          nome_completo: string | null;
          telefone: string | null;
          cargo: string | null;
          status: string;
          ultimo_acesso: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          empresa_id: number;
          role?: AppRole;
          email: string;
          nome_completo?: string | null;
          telefone?: string | null;
          cargo?: string | null;
          status?: string;
          ultimo_acesso?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["perfis"]["Insert"]>;
        Relationships: [];
      };
      empresas: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      planos: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      agentes_ia: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      conversas: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      uso_recursos: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      auditoria: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: {
      empresas_public: {
        Row: {
          id: number | null;
          nome: string | null;
          plano_id: number | null;
          chave_api_configurada: boolean | null;
          contexto_ia: Json | null;
          stripe_customer_id: string | null;
          email: string | null;
          telefone: string | null;
          endereco: string | null;
          status: string | null;
          data_adesao: string | null;
          proxima_cobranca: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Perfil = Database["public"]["Tables"]["perfis"]["Row"];
export type EmpresaPublic =
  Database["public"]["Views"]["empresas_public"]["Row"];
