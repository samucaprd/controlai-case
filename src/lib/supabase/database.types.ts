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
      auditoria: {
        Row: {
          id: number;
          user_id: string | null;
          acao: string;
          entidade_tipo: string;
          entidade_id: number | null;
          empresa_id: number | null;
          detalhes: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
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
    Functions: {
      log_auditoria: {
        Args: {
          p_acao: string;
          p_entidade_tipo: string;
          p_entidade_id?: number | null;
          p_empresa_id?: number | null;
          p_detalhes?: Json;
        };
        Returns: number;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Perfil = Database["public"]["Tables"]["perfis"]["Row"];
export type EmpresaPublic =
  Database["public"]["Views"]["empresas_public"]["Row"];
