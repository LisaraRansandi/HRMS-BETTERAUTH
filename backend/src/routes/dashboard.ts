import { Hono } from "hono";
import { db } from "../db";
import { employees, departments, leaveRequests, attendance } from "../db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { authMiddleware, SessionUser } from "../middleware/auth";

const router = new Hono<{ Variables: { user: SessionUser } }>();
router.use("*", authMiddleware);

router.get("/stats", async (c) => {
  try {
    const u = c.get("user") as SessionUser;
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = `${today.slice(0, 7)}-01`;

    if (u.role === "HR_ADMIN") {
      const [empStats, leaveStats, attendanceToday, deptStats, recentLeaves] = await Promise.all([
        db.select({ status: employees.status, count: sql<number>`count(*)::int` }).from(employees).groupBy(employees.status),
        db.select({ status: leaveRequests.status, count: sql<number>`count(*)::int` }).from(leaveRequests).where(gte(leaveRequests.createdAt, new Date(firstOfMonth))).groupBy(leaveRequests.status),
        db.select({ checkedIn: sql<number>`count(*)::int`, checkedOut: sql<number>`sum(case when ${attendance.checkOutAt} is not null then 1 else 0 end)::int` }).from(attendance).where(eq(attendance.date, today)),
        db.select({ id: departments.id, name: departments.name, headcount: sql<number>`count(${employees.id})::int` }).from(departments).leftJoin(employees, and(eq(employees.departmentId, departments.id), eq(employees.status, "ACTIVE"))).groupBy(departments.id).orderBy(departments.name),
        db.select({ id: leaveRequests.id, leaveType: leaveRequests.leaveType, startDate: leaveRequests.startDate, endDate: leaveRequests.endDate, createdAt: leaveRequests.createdAt, employeeFirstName: employees.firstName, employeeLastName: employees.lastName })
          .from(leaveRequests).leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
          .where(eq(leaveRequests.status, "PENDING")).orderBy(sql`${leaveRequests.createdAt} desc`).limit(5),
      ]);

      const empMap = Object.fromEntries(empStats.map(r => [r.status, r.count]));
      const leaveMap = Object.fromEntries(leaveStats.map(r => [r.status, r.count]));

      return c.json({ success: true, data: {
        role: "HR_ADMIN",
        employees: { total: Object.values(empMap).reduce((a, b) => a + b, 0), active: empMap.ACTIVE ?? 0, inactive: empMap.INACTIVE ?? 0, onLeave: empMap.ON_LEAVE ?? 0 },
        leaveRequests: { pendingThisMonth: leaveMap.PENDING ?? 0, approvedThisMonth: leaveMap.APPROVED ?? 0, rejectedThisMonth: leaveMap.REJECTED ?? 0 },
        attendance: attendanceToday[0] ?? { checkedIn: 0, checkedOut: 0 },
        departments: deptStats, pendingLeaveRequests: recentLeaves,
      }});
    }

    if (u.role === "MANAGER") {
      const [dept] = await db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.managerId, u.employeeId!));
      if (!dept) return c.json({ success: true, data: { role: "MANAGER", message: "No department assigned." } });

      const [teamMembers, teamAttendance] = await Promise.all([
        db.select({ status: employees.status, count: sql<number>`count(*)::int` }).from(employees).where(eq(employees.departmentId, dept.id)).groupBy(employees.status),
        db.select({ count: sql<number>`count(*)::int` }).from(attendance).innerJoin(employees, eq(attendance.employeeId, employees.id)).where(and(eq(employees.departmentId, dept.id), eq(attendance.date, today))),
      ]);

      const memberMap = Object.fromEntries(teamMembers.map(r => [r.status, r.count]));
      return c.json({ success: true, data: { role: "MANAGER", department: dept, team: { total: Object.values(memberMap).reduce((a, b) => a + b, 0), active: memberMap.ACTIVE ?? 0, onLeave: memberMap.ON_LEAVE ?? 0 }, attendanceToday: teamAttendance[0]?.count ?? 0 } });
    }

    // EMPLOYEE
    if (!u.employeeId) return c.json({ success: true, data: { role: "EMPLOYEE", message: "No employee profile linked." } });

    const [leaveHistory, attendanceSummary, todayAttendance] = await Promise.all([
      db.select({ status: leaveRequests.status, count: sql<number>`count(*)::int` }).from(leaveRequests).where(eq(leaveRequests.employeeId, u.employeeId)).groupBy(leaveRequests.status),
      db.select({ totalDays: sql<number>`count(*)::int` }).from(attendance).where(and(eq(attendance.employeeId, u.employeeId), gte(attendance.date, firstOfMonth))),
      db.select().from(attendance).where(and(eq(attendance.employeeId, u.employeeId), eq(attendance.date, today))).limit(1),
    ]);

    const leaveMap = Object.fromEntries(leaveHistory.map(r => [r.status, r.count]));
    return c.json({ success: true, data: { role: "EMPLOYEE", leaveRequests: { pending: leaveMap.PENDING ?? 0, approved: leaveMap.APPROVED ?? 0, rejected: leaveMap.REJECTED ?? 0 }, attendanceThisMonth: attendanceSummary[0] ?? { totalDays: 0 }, todayAttendance: todayAttendance[0] ?? null } });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: "Server error" }, 500);
  }
});

export default router;
