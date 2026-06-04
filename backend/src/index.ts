import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { auth } from "./auth";

import employeeRoutes from "./routes/employees";
import departmentRoutes from "./routes/departments";
import leaveRoutes from "./routes/leaves";
import attendanceRoutes from "./routes/attendance";
import dashboardRoutes from "./routes/dashboard";
import userRoutes from "./routes/users";
import authRoutes from "./routes/auth";

const app = new Hono();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors({
  origin: ["http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true, // required for Better Auth cookies
}));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ success: true, message: "HRMS API running with Better Auth", version: "2.0.0" }));
app.get("/health", (c) => c.json({ success: true, status: "healthy", timestamp: new Date().toISOString() }));

// ── Better Auth Handler ───────────────────────────────────────────────────────
// Mount auth routes so auth is handled like other route modules
app.route("/api/auth", authRoutes);

// ── HRMS Routes ───────────────────────────────────────────────────────────────
app.route("/api/employees", employeeRoutes);
app.route("/api/departments", departmentRoutes);
app.route("/api/leaves", leaveRoutes);
app.route("/api/attendance", attendanceRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/users", userRoutes);

// ── Error Handlers ────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, error: "Route not found" }, 404));
app.onError((err, c) => {
  console.error("[HRMS Error]", err);
  return c.json({ success: false, error: "Internal server error" }, 500);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001");
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n🚀 HRMS API running at http://localhost:${PORT}`);
  console.log(`🔐 Better Auth active at http://localhost:${PORT}/api/auth`);
  console.log(`📋 Health: http://localhost:${PORT}/health\n`);
});

export default app;
