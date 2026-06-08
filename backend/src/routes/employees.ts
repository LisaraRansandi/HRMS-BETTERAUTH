import { Hono } from "hono";
import { db } from "../db";
import { employees, departments, user } from "../db/schema";
import { eq, ilike, and, or, desc, sql, inArray } from "drizzle-orm";
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
    const { firstName, lastName, email, phone, epfNo, position, departmentId, hireDate, password,
      actingOfficerId, hodId, mdId, approvalChainActive } = body;

    if (!firstName || !lastName || !email || !password) {
      return c.json({ success: false, error: "Required: firstName, lastName, email, password" }, 400);
    }

    if ((password as string).length < 8) {
      return c.json({ success: false, error: "Password must be at least 8 characters" }, 400);
    }

    const normalizedEmail = (email as string).toLowerCase().trim();

    const [existingUser] = await db
      .select({ id: user.id, employeeId: user.employeeId })
      .from(user)
      .where(eq(user.email, normalizedEmail));

    if (existingUser?.employeeId) {
      return c.json({ success: false, error: "A user with this email is already linked to another employee profile." }, 400);
    }

    // Resolve and validate approval chain IDs against real employee records
    let chosenActingId: number | null = null;
    let assignedHodId: number | null = null;
    let assignedMdId: number | null = null;

    if (actingOfficerId != null) {
      const parsed = parseInt(actingOfficerId);
      if (isNaN(parsed)) return c.json({ success: false, error: "actingOfficerId must be a valid integer" }, 400);
      const [found] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed));
      if (!found) return c.json({ success: false, error: `Acting officer with id ${parsed} not found` }, 400);
      chosenActingId = found.id;
    }

    if (hodId != null) {
      const parsed = parseInt(hodId);
      if (isNaN(parsed)) return c.json({ success: false, error: "hodId must be a valid integer" }, 400);
      const [found] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed));
      if (!found) return c.json({ success: false, error: `HOD with id ${parsed} not found` }, 400);
      assignedHodId = found.id;
    }

    if (mdId != null) {
      const parsed = parseInt(mdId);
      if (isNaN(parsed)) return c.json({ success: false, error: "mdId must be a valid integer" }, 400);
      const [found] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed));
      if (!found) return c.json({ success: false, error: `MD with id ${parsed} not found` }, 400);
      assignedMdId = found.id;
    }

    const [newEmployee] = await db.insert(employees).values({
      firstName, lastName, email: normalizedEmail,
      phone: phone ?? null, epfNo: epfNo ?? null,
      position: position ?? null,
      departmentId: departmentId ? parseInt(departmentId) : null,
      hireDate: hireDate ?? null, status: "ACTIVE",
      actingOfficerId: chosenActingId,
      hodId: assignedHodId,
      mdId: assignedMdId,
      approvalChainActive: approvalChainActive ? Boolean(approvalChainActive) : false,
    }).returning();

    if (existingUser) {
      await db.update(user)
        .set({ employeeId: newEmployee.id, updatedAt: new Date() })
        .where(eq(user.id, existingUser.id));
      return c.json({ success: true, data: newEmployee }, 201);
    }

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

router.get("/me", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const empId = (session?.user as any)?.employeeId as number | null;
    if (!empId) return c.json({ success: false, error: "No employee profile linked to your account" }, 400);

    const [emp] = await db.select({
      id: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      approvalChainActive: employees.approvalChainActive,
      actingOfficerId: employees.actingOfficerId,
      hodId:           employees.hodId,
      mdId:            employees.mdId,
    }).from(employees).where(eq(employees.id, empId));

    if (!emp) return c.json({ success: false, error: "Employee profile not found" }, 404);

    const chainIds = [emp.actingOfficerId, emp.hodId, emp.mdId].filter((id): id is number => id != null);
    const members = chainIds.length
      ? await db.select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName, status: employees.status })
          .from(employees).where(inArray(employees.id, chainIds))
      : [];

    const find = (id: number | null) => members.find(m => m.id === id) ?? null;
    const acting = find(emp.actingOfficerId);
    const hod    = find(emp.hodId);
    const md     = find(emp.mdId);

    return c.json({ success: true, data: {
      ...emp,
      actingFirstName: acting?.firstName ?? null, actingLastName: acting?.lastName ?? null, actingStatus: acting?.status ?? null,
      hodFirstName:    hod?.firstName    ?? null, hodLastName:    hod?.lastName    ?? null, hodStatus:    hod?.status    ?? null,
      mdFirstName:     md?.firstName     ?? null, mdLastName:     md?.lastName     ?? null, mdStatus:     md?.status     ?? null,
    }});
  } catch (err) {
    console.error("[GET /employees/me]", err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

router.get("/:id", requireRole("HR_ADMIN", "MANAGER"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    const [row] = await db.select({
      id: employees.id, firstName: employees.firstName, lastName: employees.lastName,
      email: employees.email, phone: employees.phone, epfNo: employees.epfNo,
      position: employees.position, status: employees.status, hireDate: employees.hireDate,
      departmentId: employees.departmentId, departmentName: departments.name,
      actingOfficerId: employees.actingOfficerId,
      hodId: employees.hodId,
      mdId: employees.mdId,
      approvalChainActive: employees.approvalChainActive,
    }).from(employees).leftJoin(departments, eq(employees.departmentId, departments.id)).where(eq(employees.id, id));

    if (!row) return c.json({ success: false, error: "Employee not found" }, 404);
    return c.json({ success: true, data: row });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.patch("/:id/approval-chain", requireRole("HR_ADMIN"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    const body = await c.req.json();

    const [existingEmployee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, id));

    if (!existingEmployee) return c.json({ success: false, error: "Employee not found" }, 404);

    // Determine which chain fields were explicitly provided in the request body
    let chosenActingId: number | null | undefined = undefined;
    let assignedHodId: number | null | undefined = undefined;
    let assignedMdId: number | null | undefined = undefined;

    if ("actingOfficerId" in body) {
      if (body.actingOfficerId === null) {
        chosenActingId = null;
      } else {
        const parsed = parseInt(body.actingOfficerId);
        if (isNaN(parsed)) return c.json({ success: false, error: "actingOfficerId must be a valid integer or null" }, 400);
        const [found] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed));
        if (!found) return c.json({ success: false, error: `Acting officer with id ${parsed} not found` }, 400);
        chosenActingId = found.id;
      }
    }

    if ("hodId" in body) {
      if (body.hodId === null) {
        assignedHodId = null;
      } else {
        const parsed = parseInt(body.hodId);
        if (isNaN(parsed)) return c.json({ success: false, error: "hodId must be a valid integer or null" }, 400);
        const [found] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed));
        if (!found) return c.json({ success: false, error: `HOD with id ${parsed} not found` }, 400);
        assignedHodId = found.id;
      }
    }

    if ("mdId" in body) {
      if (body.mdId === null) {
        assignedMdId = null;
      } else {
        const parsed = parseInt(body.mdId);
        if (isNaN(parsed)) return c.json({ success: false, error: "mdId must be a valid integer or null" }, 400);
        const [found] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed));
        if (!found) return c.json({ success: false, error: `MD with id ${parsed} not found` }, 400);
        assignedMdId = found.id;
      }
    }

    const chainUpdates: Record<string, any> = {};
    if (chosenActingId !== undefined) chainUpdates.actingOfficerId = chosenActingId;
    if (assignedHodId !== undefined) chainUpdates.hodId = assignedHodId;
    if (assignedMdId !== undefined) chainUpdates.mdId = assignedMdId;
    if ("approvalChainActive" in body) chainUpdates.approvalChainActive = Boolean(body.approvalChainActive);

    if (Object.keys(chainUpdates).length === 0) {
      return c.json({ success: false, error: "No approval chain fields provided to update" }, 400);
    }

    chainUpdates.approvalChainUpdatedAt = new Date();
    chainUpdates.updatedAt = new Date();

    const [updated] = await db
      .update(employees)
      .set(chainUpdates)
      .where(eq(employees.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /employees/:id/approval-chain] error:", err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

router.patch("/:id", requireRole("HR_ADMIN"), async (c) => {
  try {
    const id = parseInt(c.req.param("id") ?? "0");
    const body = await c.req.json();
    const allowed = ["firstName", "lastName", "email", "phone", "position", "departmentId", "hireDate", "status", "actingOfficerId", "hodId", "mdId", "approvalChainActive"];
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
