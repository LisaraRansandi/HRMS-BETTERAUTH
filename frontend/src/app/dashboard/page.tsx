"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";

function StatCard({ label, value, sub, color = "var(--accent)" }: { label: string; value?: number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value ?? "—"}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)" }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats()
      .then(d => { setStats(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <AppShell>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 4 }}>{today}</div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Dashboard</h1>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-3)", marginTop: 60, textAlign: "center" }}>Loading stats…</div>
      ) : !stats ? (
        <div style={{ color: "var(--text-3)", marginTop: 60, textAlign: "center" }}>Could not load data. Make sure both servers are running.</div>
      ) : (
        <>
          {stats.role === "HR_ADMIN" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                <StatCard label="Total Employees" value={stats.employees?.total} sub={`${stats.employees?.active} active`} />
                <StatCard label="On Leave" value={stats.employees?.onLeave} color="var(--warning)" />
                <StatCard label="Checked In Today" value={stats.attendance?.checkedIn} sub={`${stats.attendance?.checkedOut} checked out`} color="var(--success)" />
                <StatCard label="Pending Leaves" value={stats.leaveRequests?.pendingThisMonth} color="var(--warning)" sub="this month" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px 24px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Departments</h3>
                  {stats.departments?.length ? stats.departments.map((d: any) => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 13 }}>{d.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{d.headcount} staff</span>
                    </div>
                  )) : <div style={{ color: "var(--text-3)", fontSize: 13 }}>No departments yet.</div>}
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px 24px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Pending Leave Requests</h3>
                  {stats.pendingLeaveRequests?.length ? stats.pendingLeaveRequests.map((l: any) => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{l.employeeFirstName} {l.employeeLastName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)" }}>{l.leaveType} · {l.startDate} → {l.endDate}</div>
                      </div>
                      <span style={{ padding: "2px 10px", borderRadius: 99, background: "var(--warning-light)", color: "var(--warning)", fontSize: 12, fontWeight: 500, alignSelf: "center" }}>Pending</span>
                    </div>
                  )) : <div style={{ color: "var(--text-3)", fontSize: 13 }}>No pending requests.</div>}
                </div>
              </div>
            </>
          )}
          {stats.role === "MANAGER" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
                <StatCard label="Team Members" value={stats.team?.total} sub={`${stats.team?.active} active`} />
                <StatCard label="On Leave" value={stats.team?.onLeave} color="var(--warning)" />
                <StatCard label="Attended Today" value={stats.attendanceToday} color="var(--success)" />
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Your Department</h3>
                <p style={{ color: "var(--text-2)", fontSize: 14 }}>{stats.department?.name || "Not assigned"}</p>
              </div>
            </>
          )}
          {stats.role === "EMPLOYEE" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
                <StatCard label="Leave Pending" value={stats.leaveRequests?.pending} color="var(--warning)" />
                <StatCard label="Leave Approved" value={stats.leaveRequests?.approved} color="var(--success)" />
                <StatCard label="Days Attended" value={stats.attendanceThisMonth?.totalDays} sub="this month" />
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Today's Attendance</h3>
                {stats.todayAttendance ? (
                  <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                    In: {stats.todayAttendance.checkInAt ? new Date(stats.todayAttendance.checkInAt).toLocaleTimeString() : "—"} · Out: {stats.todayAttendance.checkOutAt ? new Date(stats.todayAttendance.checkOutAt).toLocaleTimeString() : "Still working"}
                  </div>
                ) : <p style={{ color: "var(--text-3)", fontSize: 13 }}>You haven't checked in today.</p>}
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
