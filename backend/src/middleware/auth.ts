import { Context, Next } from "hono";
import { auth } from "../auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "HR_ADMIN" | "MANAGER" | "EMPLOYEE";
  employeeId: number | null;
}

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  c.set("user", session.user as unknown as SessionUser);
  await next();
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as SessionUser;
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }
    await next();
  };
}