import { Hono } from "hono";
import { db } from "../db";
import { employees, departments, user } from "../db/schema";
import { eq, ilike, and, or, desc, sql } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";
import { auth } from "../auth";

const router = new Hono();
router.use("*", authMiddleware);

router.get("/", requireRole("HR_ADMIN", "MANAGER"), async (c) => {
  try {
    const search = c.req.query("search") ?? "";
    const departmentId = c.req.query("department");
    const status = c.req.query("status");
    const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
    const limit = Math.min(100, parseInt(c.req.query("limit") ?? "20"));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(employees.firstName, `%${search}%`), ilike(employees.lastName, `%${search}%`), ilike(employees.email, `%${search}%`)));
    if (departmentId) conditions.push(eq(employees.departmentId, parseInt(departmentId)));
    if (status) conditions.push(eq(employees.status, status as any));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ count }]] = await Promise.all([
      db.select({
        id: employees.id, firstName: employees.firstName, lastName: employees.lastName,
        email: employees.email, phone: employees.phone, position: employees.position,
        status: employees.status, hireDate: employees.hireDate,
        departmentId: employees.departmentId, departmentName: departments.name,
      }).from(employees).leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(where).orderBy(desc(employees.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(employees).where(where),
    ]);

    return c.json({ success: true, data: { employees: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } } });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

router.post("/", requireRole("HR_ADMIN"), async (c) => {
  try {
    const body = await c.req.json();
    const { firstName, lastName, email, phone, epfNo, position, departmentId, hireDate, password } = body;

    if (!firstName || !lastName || !email || !password) {
      return c.json({ success: false, error: "Required: firstName, lastName, email, password" }, 400);
    }

    if ((password as string).length < 8) {
      return c.json({ success: false, error: "Password must be at least 8 characters" }, 400);
    }

    const normalizedEmail = (email as string).toLowerCase().trim();

    // Check upfront if a user account with this email already exists
    const [existingUser] = await db
      .select({ id: user.id, employeeId: user.employeeId })
      .from(user)
      .where(eq(user.email, normalizedEmail));

    if (existingUser?.employeeId) {
      return c.json({ success: false, error: "A user with this email is already linked to another employee profile." }, 400);
    }

    const [newEmployee] = await db.insert(employees).values({
      firstName, lastName, email: normalizedEmail,
      phone: phone ?? null, epfNo: epfNo ?? null,
      position: position ?? null,
      departmentId: departmentId ? parseInt(departmentId) : null,
      hireDate: hireDate ?? null, status: "ACTIVE",
    }).returning();

    if (existingUser) {
      // User already has an account (self-registered) — just link the new employee record to it
      await db.update(user)
        .set({ employeeId: newEmployee.id, updatedAt: new Date() })
        .where(eq(user.id, existingUser.id));
      return c.json({ success: true, data: newEmployee }, 201);
    }

    // No existing user — create a fresh account via Better Auth
    try {
      await auth.api.signUpEmail({
        body: {
          email: normalizedEmail,
          password,
          name: `${firstName} ${lastName}`,
          role: "EMPLOYEE",
          employeeId: newEmployee.id,
          epfNo: epfNo ?? undefined,
        },
      });
    } catch (authErr: any) {
      console.error("[POST /employees] auth.api.signUpEmail failed:", authErr);
      await db.delete(employees).where(eq(employees.id, newEmployee.id));
      const msg = authErr?.body?.message ?? authErr?.message ?? "Failed to create user account";
      return c.json({ success: false, error: msg }, 500);
    }

    return c.json({ success: true, data: newEmployee }, 201);
  } catch (err: any) {
    console.error("[POST /employees] outer error:", err);
    if (err.code === "23505") return c.json({ success: false, error: "Email already exists." }, 400);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

router.get("/:id", requireRole("HR_ADMIN", "MANAGER"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    const [row] = await db.select({
      id: employees.id, firstName: employees.firstName, lastName: employees.lastName,
      email: employees.email, phone: employees.phone, position: employees.position,
      status: employees.status, hireDate: employees.hireDate, departmentName: departments.name,
    }).from(employees).leftJoin(departments, eq(employees.departmentId, departments.id)).where(eq(employees.id, id));

    if (!row) return c.json({ success: false, error: "Employee not found" }, 404);
    return c.json({ success: true, data: row });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.patch("/:id", requireRole("HR_ADMIN"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    const body = await c.req.json();
    const allowed = ["firstName", "lastName", "email", "phone", "position", "departmentId", "hireDate", "status"];
    const updates: Record<string, any> = {};
    for (const key of allowed) { if (key in body) updates[key] = body[key]; }
    updates.updatedAt = new Date();

    const [updated] = await db.update(employees).set(updates).where(eq(employees.id, id)).returning();
    if (!updated) return c.json({ success: false, error: "Employee not found" }, 404);
    return c.json({ success: true, data: updated });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.delete("/:id", requireRole("HR_ADMIN"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    await db.update(employees).set({ status: "INACTIVE", updatedAt: new Date() }).where(eq(employees.id, id));
    await db.update(user).set({ updatedAt: new Date() }).where(eq(user.employeeId, id));
    return c.json({ success: true, data: { message: "Employee deactivated" } });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

export default router;
