import { describe, it, expect, vi } from "vitest";
import { dbPackageInfo, DatabaseContext } from "./index";

describe("@bigflux/db framework", () => {
  it("exposes its package identity", () => {
    const info = dbPackageInfo();
    expect(info.name).toBe("@bigflux/db");
    expect(info.story).toBe("S0.1");
  });

  it("manages tenant context locally and triggers RPC", async () => {
    const ctx = new DatabaseContext('https://mock-project.supabase.co', 'mock-anon-key');
    expect(ctx.getCurrentTenantId()).toBeNull();

    // Mock RPC calls
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    ctx.getClient().rpc = mockRpc;

    const tenantId = '00000000-0000-0000-0000-000000000001';
    await ctx.setTenantContext(tenantId);
    expect(ctx.getCurrentTenantId()).toBe(tenantId);
    expect(mockRpc).toHaveBeenCalledWith('set_tenant_context', { tenant_id: tenantId });

    await ctx.setTenantContext(null);
    expect(ctx.getCurrentTenantId()).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('clear_tenant_context');
  });

  it("handles audit log recording for super admins", async () => {
    const ctx = new DatabaseContext('https://mock-project.supabase.co', 'mock-anon-key');
    
    // Mock builder syntax of supabase-js
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    ctx.getClient().from = mockFrom;

    await ctx.logSuperAdminAction('user-1', 'view_dashboard', 'tenant-b', { ip: '127.0.0.1' });
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      action: 'view_dashboard',
      target_tenant_id: 'tenant-b',
      details: { ip: '127.0.0.1' }
    });
  });
});
