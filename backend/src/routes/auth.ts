import { Hono } from "hono";
import { auth } from "../auth";

const router = new Hono();

// Forward all auth-related requests to the Better Auth handler.
// Better Auth expects the exact request path under /api/auth.
router.all("/*", (c) => {
  return auth.handler(c.req.raw);
});

export default router;
