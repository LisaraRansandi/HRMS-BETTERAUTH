"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";

export default function AttendancePage() {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");
  const [report, setReport] = useState<any[]>([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));

  async function loadToday() {
    const d = await api.getAttendanceToday();
    setRecord((d.data as any)?.record ?? null);
    setLoading(false);
  }

  async function loadReport() {
    const d = await api.getAttendanceReport(reportDate);
    setReport((d.data as any)?.records ?? []);
  }

  useEffect(() => { loadToday(); loadReport(); }, []);
  useEffect(() => { loadReport(); }, [reportDate]);

  async function checkIn() {
    setWorking(true); setMsg("");
    const res = await api.checkIn();
    setMsg(res.success ? (res.data as any)?.message : res.error ?? "Failed");
    if (res.success) loadToday();
    setWorking(false);
  }

  async function checkOut() {
    setWorking(true); setMsg("");
    const res = await api.checkOut();
    setMsg(res.success ? (res.data as any)?.message : res.error ?? "Failed");
    if (res.success) loadToday();
    setWorking(false);
  }

  const fmt = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <AppShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Attendance</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>Track daily check-ins and check-outs</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, marginBottom: 28 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Today</h3>
          {loading ? <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading…</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>Check In</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(record?.checkInAt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>Check Out</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(record?.checkOutAt)}</span>
              </div>
              {msg && <div style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: msg.includes("recorded") || msg.includes("out") ? "var(--success-light)" : "var(--danger-light)", color: msg.includes("recorded") || msg.includes("out") ? "var(--success)" : "var(--danger)", fontSize: 12 }}>{msg}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={checkIn} disabled={working || !!record?.checkInAt} style={{ flex: 1, padding: "9px 0", background: record?.checkInAt ? "var(--surface-2)" : "var(--accent)", color: record?.checkInAt ? "var(--text-3)" : "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: record?.checkInAt ? "default" : "pointer" }}>Check In</button>
                <button onClick={checkOut} disabled={working || !record?.checkInAt || !!record?.checkOutAt} style={{ flex: 1, padding: "9px 0", background: !record?.checkInAt || record?.checkOutAt ? "var(--surface-2)" : "var(--success)", color: !record?.checkInAt || record?.checkOutAt ? "var(--text-3)" : "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: !record?.checkInAt || record?.checkOutAt ? "default" : "pointer" }}>Check Out</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Daily Report</h3>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Total", report.length], ["Checked In", report.filter(r => r.checkInAt).length], ["Checked Out", report.filter(r => r.checkOutAt).length]].map(([label, val]) => (
              <div key={label as string} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{val}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["Employee", "Department", "Check In", "Check Out", "Duration"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.length === 0
              ? <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>No records for this date.</td></tr>
              : report.map((r, i) => (
                <tr key={r.attendanceId} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--bg)" }}>
                  <td style={{ padding: "13px 16px", fontWeight: 500, fontSize: 13 }}>{r.firstName} {r.lastName}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-2)" }}>{r.departmentName || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-2)" }}>{fmt(r.checkInAt)}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-2)" }}>{fmt(r.checkOutAt)}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-2)" }}>{r.durationMinutes ? `${Math.floor(r.durationMinutes / 60)}h ${Math.round(r.durationMinutes % 60)}m` : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
