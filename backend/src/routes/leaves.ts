import { Hono } from "hono";
import { db } from "../db";
import { leaveRequests, employees, notifications, user } from "../db/schema";
import { eq, and, desc, sum } from "drizzle-orm";
import { authMiddleware, requireRole, SessionUser } from "../middleware/auth";
import { calculateEarnedLeave, computeLeaveDays } from "../utils/leave";

type AppEnv = { Variables: { user: SessionUser } };
const router = new Hono<AppEnv>();
router.use("*", authMiddleware);

// GET /employees — active employee list for acting officer dropdown (all authenticated users)
router.get("/employees", async (c) => {
  try {
    const rows = await db
      .select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName })
      .from(employees)
      .where(eq(employees.status, "ACTIVE"))
      .orderBy(employees.firstName);
    return c.json({ success: true, data: rows });
  } catch { return c.json({ success: false, error: "Server error" }, 500); }
});

// GET / — fetch leaves based on role and stage view
router.get("/", async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    const stage = c.req.query("stage"); // "own" | "acting" | "hod" | "md"
    const status = c.req.query("status");
    const conditions: any[] = [];

    if (stage === "acting" && u.employeeId) {
      conditions.push(eq(leaveRequests.actingOfficerId, u.employeeId));
    } else if (stage === "hod" && u.employeeId) {
      conditions.push(eq(leaveRequests.actingOfficerStatus, "ACCEPTED"));
      conditions.push(eq(leaveRequests.assignedHodId, u.employeeId));
    } else if (stage === "md" && u.employeeId) {
      conditions.push(eq(leaveRequests.hodStatus, "RECOMMENDED"));
      conditions.push(eq(leaveRequests.assignedMdId, u.employeeId));
    } else if (stage === "own" && u.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, u.employeeId));
    } else if (u.role === "EMPLOYEE" && u.employeeId) {
      // Default for employees: show only their own
      conditions.push(eq(leaveRequests.employeeId, u.employeeId));
    }
    // HR_ADMIN / MANAGER with no stage: see everything

    if (status) conditions.push(eq(leaveRequests.status, status as any));

    const rows = await db.select({
      id: leaveRequests.id,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      reviewNote: leaveRequests.reviewNote,
      reviewedAt: leaveRequests.reviewedAt,
      createdAt: leaveRequests.createdAt,
      employeeId: leaveRequests.employeeId,
      employeeFirstName: employees.firstName,
      employeeLastName: employees.lastName,
      isHalfDay: leaveRequests.isHalfDay,
      halfDaySession: leaveRequests.halfDaySession,
      actingOfficerId: leaveRequests.actingOfficerId,
      actingOfficerStatus: leaveRequests.actingOfficerStatus,
      hodStatus: leaveRequests.hodStatus,
      mdStatus: leaveRequests.mdStatus,
    })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(leaveRequests.createdAt));

    return c.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

// POST / — submit a leave application
router.post("/", async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    if (!u.employeeId)
      return c.json({ success: false, error: "No employee profile linked to your account" }, 400);

    const { leaveType, startDate, endDate, reason, isHalfDay, halfDaySession, actingOfficerId } =
      await c.req.json();

    if (!leaveType || !startDate || !endDate)
      return c.json({ success: false, error: "Required: leaveType, startDate, endDate" }, 400);
    if (new Date(endDate) < new Date(startDate))
      return c.json({ success: false, error: "End date cannot be before start date" }, 400);
    if (isHalfDay && startDate !== endDate)
      return c.json({ success: false, error: "Half-day requests must have the same start and end date" }, 400);

    // If no actingOfficerId provided, fall back to the employee's assigned chain
    let chosenActingId: number | null = actingOfficerId ? parseInt(actingOfficerId) : null;
    let assignedHodId: number | null = null;
    let assignedMdId: number | null = null;
    if (!chosenActingId) {
      const [emp] = await db.select({
        actingOfficerId: employees.actingOfficerId,
        hodId: employees.hodId,
        mdId: employees.mdId,
        approvalChainActive: employees.approvalChainActive,
      }).from(employees).where(eq(employees.id, u.employeeId));
      if (!emp) return c.json({ success: false, error: "Employee profile not found" }, 400);
      if (!emp.approvalChainActive)
        return c.json({ success: false, error: "Your approval chain has not been activated. Contact HR to configure it before submitting leave." }, 400);
      chosenActingId = emp.actingOfficerId ?? null;
      assignedHodId = emp.hodId ?? null;
      assignedMdId = emp.mdId ?? null;
    }

    const [leave] = await db.insert(leaveRequests).values({
      employeeId: u.employeeId,
      leaveType,
      startDate,
      endDate,
      reason: reason ?? null,
      status: "PENDING",
      leaveDays: computeLeaveDays(startDate, endDate, isHalfDay ?? false),
      isHalfDay: isHalfDay ?? false,
      halfDaySession: isHalfDay ? (halfDaySession ?? "FIRST_HALF") : "NONE",
      actingOfficerId: chosenActingId,
      actingOfficerStatus: "PENDING",
      hodStatus: "PENDING",
      mdStatus: "PENDING",
      assignedHodId: assignedHodId,
      assignedMdId: assignedMdId,
      currentApproverEmployeeId: chosenActingId,
      approvalStage: "ACTING",
    }).returning();

    return c.json({ success: true, data: leave }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

// GET /remaining — leave balance for the logged-in employee
router.get("/remaining", async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    if (!u.employeeId)
      return c.json({ success: false, error: "No employee profile linked" }, 400);

    const [emp] = await db
      .select({ hireDate: employees.hireDate })
      .from(employees)
      .where(eq(employees.id, u.employeeId));

    if (!emp?.hireDate)
      return c.json({ success: false, error: "No hire date set for this employee" }, 400);

    const earned = calculateEarnedLeave(emp.hireDate);

    const [row] = await db
      .select({ taken: sum(leaveRequests.leaveDays) })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.employeeId, u.employeeId),
        eq(leaveRequests.status, "APPROVED"),
      ));

    const taken = parseFloat(row?.taken ?? "0");
    const remaining = Math.max(0, earned - taken);

    return c.json({ success: true, data: { earned, taken, remaining, hireDate: emp.hireDate } });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

// PUT /:id/acting — Stage 1: acting officer accepts or declines coverage
router.put("/:id/acting", async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    const id = parseInt(c.req.param("id") ?? "0");
    const { actingOfficerStatus } = await c.req.json();

    if (!["ACCEPTED", "DECLINED"].includes(actingOfficerStatus))
      return c.json({ success: false, error: "actingOfficerStatus must be ACCEPTED or DECLINED" }, 400);

    const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!existing) return c.json({ success: false, error: "Not found" }, 404);
    if (existing.actingOfficerId !== u.employeeId)
      return c.json({ success: false, error: "You are not the designated acting officer" }, 403);
    if (existing.actingOfficerStatus !== "PENDING")
      return c.json({ success: false, error: "You have already responded to this request" }, 400);

    const nextStageFields =
      actingOfficerStatus === "ACCEPTED"
        ? { approvalStage: "HOD" as const, currentApproverEmployeeId: existing.assignedHodId }
        : { approvalStage: "REJECTED" as const, status: "REJECTED" as const, currentApproverEmployeeId: null };

    const [updated] = await db.update(leaveRequests)
      .set({ actingOfficerStatus, ...nextStageFields, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

// PUT /:id/hod — Stage 2: HOD recommends or does not recommend
router.put("/:id/hod", requireRole("MANAGER", "HR_ADMIN"), async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    const id = parseInt(c.req.param("id") ?? "0");
    const { hodStatus, reviewNote } = await c.req.json();

    if (!["RECOMMENDED", "NOT_RECOMMENDED"].includes(hodStatus))
      return c.json({ success: false, error: "hodStatus must be RECOMMENDED or NOT_RECOMMENDED" }, 400);

    const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!existing) return c.json({ success: false, error: "Not found" }, 404);
    if (existing.assignedHodId !== u.employeeId)
      return c.json({ success: false, error: "You are not the designated HOD for this request" }, 403);
    if (existing.actingOfficerId && existing.actingOfficerStatus !== "ACCEPTED")
      return c.json({ success: false, error: "Acting officer must accept coverage before HOD review" }, 400);
    if (existing.hodStatus !== "PENDING")
      return c.json({ success: false, error: "HOD has already reviewed this request" }, 400);

    const nextStageFields =
      hodStatus === "RECOMMENDED"
        ? { approvalStage: "MD" as const, currentApproverEmployeeId: existing.assignedMdId }
        : { approvalStage: "REJECTED" as const, status: "REJECTED" as const, currentApproverEmployeeId: null };

    const [updated] = await db.update(leaveRequests)
      .set({ hodStatus, reviewedBy: u.id, reviewNote: reviewNote ?? null, ...nextStageFields, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

// PUT /:id/md — Stage 3: MD/Chairman final approval
router.put("/:id/md", requireRole("HR_ADMIN"), async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    const id = parseInt(c.req.param("id") ?? "0");
    const { mdStatus, reviewNote } = await c.req.json();

    if (!["APPROVED", "NOT_APPROVED"].includes(mdStatus))
      return c.json({ success: false, error: "mdStatus must be APPROVED or NOT_APPROVED" }, 400);

    const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!existing) return c.json({ success: false, error: "Not found" }, 404);
    if (existing.assignedMdId !== u.employeeId)
      return c.json({ success: false, error: "You are not the designated MD for this request" }, 403);
    if (existing.hodStatus !== "RECOMMENDED")
      return c.json({ success: false, error: "HOD must recommend before MD approval" }, 400);
    if (existing.mdStatus !== "PENDING")
      return c.json({ success: false, error: "MD has already reviewed this request" }, 400);

    const finalStatus = mdStatus === "APPROVED" ? "APPROVED" : "REJECTED";
    const finalStage = mdStatus === "APPROVED" ? "COMPLETED" : "REJECTED";

    const [updated] = await db.transaction(async (tx) => {
      const [leave] = await tx.update(leaveRequests)
        .set({
          mdStatus,
          status: finalStatus as any,
          approvalStage: finalStage as any,
          currentApproverEmployeeId: null,
          reviewedBy: u.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote ?? null,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, id))
        .returning();

      // Notify the employee whose leave was decided
      const [empUser] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.employeeId, leave.employeeId));

      if (empUser) {
        const title = finalStatus === "APPROVED" ? "Leave Approved" : "Leave Not Approved";
        const message =
          finalStatus === "APPROVED"
            ? `Your ${leave.leaveType} leave (${leave.startDate} – ${leave.endDate}) has been approved.`
            : `Your ${leave.leaveType} leave request was not approved.${reviewNote ? ` Reason: ${reviewNote}` : ""}`;
        await tx.insert(notifications).values({
          userId: empUser.id,
          title,
          message,
          relatedEntityType: "leave_request",
          relatedEntityId: leave.id,
        });
      }

      return [leave];
    });

    return c.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

export default router;
