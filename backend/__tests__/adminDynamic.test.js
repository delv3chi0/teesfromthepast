import request from "supertest";
import app from "../app.js";
import { pushAuditLog } from "../config/dynamicConfig.js";

describe("Dynamic Admin Console", () => {
  function auth(req) { return req.set("Authorization", "Bearer admin"); }

  it("returns runtime snapshot", async () => {
    const res = await auth(request(app).get("/api/admin/runtime/config"));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.snapshot.rateLimit).toBeDefined();
  });

  it("rejects invalid rate limit algorithm", async () => {
    const res = await auth(request(app).put("/api/admin/runtime/rate-limit").send({ algorithm: "nope" }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates security flag", async () => {
    const res = await auth(request(app).put("/api/admin/runtime/security").send({ cspReportOnly: false }));
    expect(res.status).toBe(200);
    expect(res.body.security.cspReportOnly).toBe(false);
  });

  it("lists and filters audit logs", async () => {
    pushAuditLog({ category: "rateLimit", message: "cfg1" });
    pushAuditLog({ category: "security", message: "cfg2" });
    const cats = await auth(request(app).get("/api/admin/audit/categories"));
    expect(cats.body.categories).toEqual(expect.arrayContaining(["rateLimit", "security"]));
    const secOnly = await auth(request(app).get("/api/admin/audit/logs?category=security"));
    expect(secOnly.body.logs.every(l => l.category === "security")).toBe(true);
  });
});