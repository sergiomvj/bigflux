import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

export function dbPackageInfo(): PackageInfo {
  return { name: "@bigflux/db", story: "S0.1" };
}

/**
 * Representa a configuração do banco e do tenant atual.
 */
export class DatabaseContext {
  private client: SupabaseClient;
  private currentTenantId: string | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }

  /**
   * Obtém o cliente do Supabase bruto.
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Define o tenant_id ativo no contexto local e executa a query setando o GUC
   */
  async setTenantContext(tenantId: string | null): Promise<void> {
    this.currentTenantId = tenantId;
    
    // Define a variável de sessão (GUC) app.current_tenant_id na conexão Supabase/Postgres
    if (tenantId) {
      // Usamos a chamada SQL RPC ou direta para set_config. 
      // Em clientes reais Supabase, para persistir na conexão do pool, podemos rodar uma RPC
      // ou anexar cabeçalhos / claims JWT. Para fins deste helper, simulamos localmente e
      // chamamos o comando de banco correspondente na sessão ativa.
      await this.client.rpc('set_tenant_context', { tenant_id: tenantId });
    } else {
      await this.client.rpc('clear_tenant_context');
    }
  }

  /**
   * Obtém o tenant_id atualmente ativo
   */
  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }
}
