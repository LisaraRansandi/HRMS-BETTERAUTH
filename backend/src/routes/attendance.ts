import { Hono } from "hono";
import { db } from "../db";
import { attendance, employees, departments } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { authMiddleware, requireRole, SessionUser } from "../middleware/auth";

const router = new Hono();
router.use("*", authMiddleware);

router.post("/check-in", async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    if (!u.employeeId) return c.json({ success: false, error: "No employee profile linked" }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const [existing] = await db.select().from(attendance)
      .where(and(eq(attendance.employeeId, u.employeeId), eq(attendance.date, today)));

    if (existing) return c.json({ success: false, error: "Already checked in today." }, 400);

    const [record] = await db.insert(attendance).values({
      employeeId: u.employeeId, date: today, checkInAt: new Date(),
    }).returning();

    return c.json({ success: true, data: { ...record, message: "Check-in recorded." } });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.put("/check-out", async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    if (!u.employeeId) return c.json({ success: false, error: "No employee profile linked" }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const [existing] = await db.select().from(attendance)
      .where(and(eq(attendance.employeeId, u.employeeId), eq(attendance.date, today)));

    if (!existing) return c.json({ success: false, error: "No check-in found for today." }, 404);
    if (existing.checkOutAt) return c.json({ success: false, error: "Already checked out." }, 400);

    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - new Date(existing.checkInAt!).getTime()) / 60_000);

    const [updated] = await db.update(attendance).set({ checkOutAt: now, updatedAt: now })
      .where(eq(attendance.id, existing.id)).returning();

    return c.json({ success: true, data: { ...updated, durationMinutes, message: `Checked out. Total: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m.` } });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.get("/report", requireRole("HR_ADMIN", "MANAGER"), async (c) => {
  try {
    const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
    const departmentId = c.req.query("departmentId");
    const conditions: any[] = [eq(attendance.date, date)];
    if (departmentId) conditions.push(eq(employees.departmentId, parseInt(departmentId)));

    const rows = await db.select({
      attendanceId: attendance.id, date: attendance.date,
      checkInAt: attendance.checkInAt, checkOutAt: attendance.checkOutAt,
      employeeId: employees.id, firstName: employees.firstName, lastName: employees.lastName,
      position: employees.position, departmentName: departments.name,
      durationMinutes: sql<number>`CASE WHEN ${attendance.checkOutAt} IS NOT NULL THEN EXTRACT(EPOCH FROM (${attendance.checkOutAt} - ${attendance.checkInAt})) / 60 ELSE NULL END`,
    }).from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions));

    return c.json({ success: true, data: { date, summary: { total: rows.length, checkedIn: rows.filter(r => r.checkInAt).length, checkedOut: rows.filter(r => r.checkOutAt).length }, records: rows } });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

export default router;
