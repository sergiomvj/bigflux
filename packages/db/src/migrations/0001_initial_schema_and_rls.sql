-- Migration 0001: Initial Schema and RLS for Tenant Isolation
-- Módulo 0 - Data (FBR Pipeline)

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------
-- 1. Tenants & Membership
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment TEXT,
  business_model TEXT,
  size_estimate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','approver','traffic_manager','viewer','super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships(user_id);

-- ----------------------------------------------------
-- 2. Domain Domain Tables: Big Flux Documents & Revisions
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS big_flux_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'archived', 'failed')),
  
  -- Content
  markdown_content TEXT NOT NULL,
  structured_data JSONB NOT NULL,
  executive_summary TEXT,

  -- Tracing
  source_report_snapshot JSONB NOT NULL,
  prompt_version TEXT NOT NULL,
  model_used TEXT NOT NULL,

  -- Audit & Metadata
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  archived_reason TEXT,

  -- Cost
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(10, 4),

  UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_big_flux_tenant_status ON big_flux_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_big_flux_project_version ON big_flux_documents(project_id, version DESC);

CREATE TABLE IF NOT EXISTS big_flux_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  big_flux_id UUID NOT NULL REFERENCES big_flux_documents(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  section TEXT NOT NULL,
  previous_content TEXT,
  new_content TEXT,
  reason TEXT
);

-- ----------------------------------------------------
-- 3. Row Level Security (RLS) Configuration
-- ----------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE big_flux_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE big_flux_revisions ENABLE ROW LEVEL SECURITY;

-- Fall-closed current_setting tenant policy for domain tables
-- The policy evaluates true if the tenant_id matches current_setting('app.current_tenant_id')
-- If setting is missing/null, current_setting throws error or yields null, resulting in fail-closed behaviour.

CREATE POLICY tenant_isolation ON tenants
  USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation ON tenant_memberships
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation ON big_flux_documents
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- Revisions are secured through their parent document
CREATE POLICY tenant_isolation ON big_flux_revisions
  USING (
    EXISTS (
      SELECT 1 FROM big_flux_documents
      WHERE big_flux_documents.id = big_flux_revisions.big_flux_id
    )
  );
