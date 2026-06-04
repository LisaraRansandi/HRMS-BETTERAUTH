import { Hono } from "hono";
import { db } from "../db";
import { user, employees } from "../db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { authMiddleware, requireRole, SessionUser } from "../middleware/auth";

type AppEnv = { Variables: { user: SessionUser } };
const router = new Hono<AppEnv>();
router.use("*", authMiddleware);

router.get("/", requireRole("HR_ADMIN"), async (c) => {
  try {
    const search = c.req.query("search") ?? "";
    const rows = await db.select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId,
      createdAt: user.createdAt,
      firstName: employees.firstName,
      lastName: employees.lastName,
      position: employees.position,
    }).from(user).leftJoin(employees, eq(user.employeeId, employees.id))
      .where(search ? or(ilike(user.email, `%${search}%`), ilike(user.name, `%${search}%`)) : undefined)
      .orderBy(user.createdAt);

    return c.json({ success: true, data: rows });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

router.patch("/:id", requireRole("HR_ADMIN"), async (c) => {
  try {
    const id = c.req.param("id")!;
    const body = await c.req.json();

    if (!("role" in body)) return c.json({ success: false, error: "No valid fields provided" }, 400);
    if (!["HR_ADMIN", "MANAGER", "EMPLOYEE"].includes(body.role))
      return c.json({ success: false, error: "Invalid role" }, 400);

    const [updated] = await db.update(user)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning({ id: user.id, email: user.email, role: user.role });

    if (!updated) return c.json({ success: false, error: "User not found" }, 404);
    return c.json({ success: true, data: updated });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

export default router;
