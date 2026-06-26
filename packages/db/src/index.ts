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

  /**
   * Helper para auditoria de ações do Super Admin
   */
  async logSuperAdminAction(userId: string, action: string, targetTenantId: string, details?: Record<string, any>): Promise<void> {
    const { error } = await this.client
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        target_tenant_id: targetTenantId,
        details
      });
    
    if (error) {
      throw new Error(`Failed to log super admin action: ${error.message}`);
    }
  }
}
