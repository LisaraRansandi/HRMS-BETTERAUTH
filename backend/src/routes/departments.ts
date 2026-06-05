import { Hono } from "hono";
import { db } from "../db";
import { departments, employees } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = new Hono();
router.use("*", authMiddleware);

router.get("/", async (c) => {
  try {
    const rows = await db.select({
      id: departments.id, name: departments.name,
      description: departments.description, managerId: departments.managerId,
      createdAt: departments.createdAt,
      employeeCount: sql<number>`count(${employees.id})::int`,
    }).from(departments).leftJoin(employees, eq(employees.departmentId, departments.id))
      .groupBy(departments.id).orderBy(departments.name);
    return c.json({ success: true, data: rows });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.post("/", requireRole("HR_ADMIN"), async (c) => {
  try {
    const { name, description, managerId } = await c.req.json();
    if (!name?.trim()) return c.json({ success: false, error: "Name is required" }, 400);
    const [dept] = await db.insert(departments).values({
      name: name.trim(), description: description?.trim() ?? null,
      managerId: managerId ? parseInt(managerId) : null,
    }).returning();
    return c.json({ success: true, data: dept }, 201);
  } catch (err: any) {
    if (err.code === "23505") return c.json({ success: false, error: "Department already exists" }, 400);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

router.get("/:id", requireRole("HR_ADMIN", "MANAGER"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    const [dept] = await db.select().from(departments).where(eq(departments.id, id));
    if (!dept) return c.json({ success: false, error: "Not found" }, 404);
    const members = await db.select({
      id: employees.id, firstName: employees.firstName,
      lastName: employees.lastName, position: employees.position, status: employees.status,
    }).from(employees).where(eq(employees.departmentId, id));
    return c.json({ success: true, data: { ...dept, employees: members } });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.patch("/:id", requireRole("HR_ADMIN"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    const body = await c.req.json();
    const updates: Record<string, any> = {};
    if ("name" in body) updates.name = body.name.trim();
    if ("description" in body) updates.description = body.description;
    if ("managerId" in body) updates.managerId = body.managerId;
    updates.updatedAt = new Date();
    const [updated] = await db.update(departments).set(updates).where(eq(departments.id, id)).returning();
    if (!updated) return c.json({ success: false, error: "Not found" }, 404);
    return c.json({ success: true, data: updated });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

export default router;
