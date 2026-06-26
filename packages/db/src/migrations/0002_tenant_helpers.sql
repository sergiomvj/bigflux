-- Migration 0002: Tenant Context Functions, Audit Logging, and Super-admin Views
-- S0.1 (Modelo multi-tenant com RLS e isolamento comprovado)

-- 1. Função para definir o tenant_id ativo na sessão
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para limpar o tenant_id da sessão
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Tabela de Auditoria para acessos de Super-admin
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_tenant_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS no audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política de RLS para audit_logs: apenas o próprio tenant lê seus logs, ou super_admin
CREATE POLICY tenant_isolation ON audit_logs
  USING (
    target_tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
    OR EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.user_id = audit_logs.user_id
        AND tenant_memberships.role = 'super_admin'
    )
  );

-- 4. View Materializada Segura consolidada para Super-admin (cross-tenant read-only)
CREATE OR REPLACE VIEW super_admin_tenants_view AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.segment,
  t.business_model,
  (SELECT COUNT(*) FROM tenant_memberships m WHERE m.tenant_id = t.id) AS member_count,
  t.created_at
FROM tenants t;
