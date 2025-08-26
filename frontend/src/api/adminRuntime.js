export async function apiFetch(path, options = {}) {
  const res = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  if (!res.ok) {
    let body; try { body = await res.json(); } catch {}
    const err = new Error(body?.error?.message || `Request failed: ${res.status}`);
    err.status = res.status; err.details = body; throw err;
  }
  return res.json();
}
export function fetchRuntimeConfig() { return apiFetch("/api/admin/runtime/config"); }
export function updateRateLimitConfig(data) { return apiFetch("/api/admin/runtime/rate-limit", { method: "PUT", body: JSON.stringify(data) }); }
export function updateSecurityConfig(data) { return apiFetch("/api/admin/runtime/security", { method: "PUT", body: JSON.stringify(data) }); }
export function fetchAuditCategories() { return apiFetch("/api/admin/audit/categories"); }
export function fetchAuditLogs(params = {}) { const qp = new URLSearchParams(); Object.entries(params).forEach(([k,v]) => { if (v!==undefined && v!==null && v!=='') qp.set(k,v); }); return apiFetch(`/api/admin/audit/logs?${qp.toString()}`); }