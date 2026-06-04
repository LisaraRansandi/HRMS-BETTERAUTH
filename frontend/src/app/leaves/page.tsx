"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

// ── Status badge ──────────────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 99, background: bg, color, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

const FINAL_BADGE: Record<string, [string, string]> = {
  PENDING:  ["var(--warning-light)",  "var(--warning)"],
  APPROVED: ["var(--success-light)",  "var(--success)"],
  REJECTED: ["var(--danger-light)",   "var(--danger)"],
};
const ACTING_BADGE: Record<string, [string, string]> = {
  PENDING:  ["#fef9c3", "#854d0e"],
  ACCEPTED: ["var(--success-light)",  "var(--success)"],
  DECLINED: ["var(--danger-light)",   "var(--danger)"],
};
const HOD_BADGE: Record<string, [string, string]> = {
  PENDING:          ["#fef9c3", "#854d0e"],
  RECOMMENDED:      ["var(--success-light)", "var(--success)"],
  NOT_RECOMMENDED:  ["var(--danger-light)",  "var(--danger)"],
};
const MD_BADGE: Record<string, [string, string]> = {
  PENDING:      ["#fef9c3", "#854d0e"],
  APPROVED:     ["var(--success-light)", "var(--success)"],
  NOT_APPROVED: ["var(--danger-light)",  "var(--danger)"],
};

function PipelineBadge({ actingOfficerStatus, hodStatus, mdStatus, hasActing }: {
  actingOfficerStatus: string; hodStatus: string; mdStatus: string; hasActing: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {hasActing && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-3)", width: 44 }}>Acting</span>
          <Badge label={actingOfficerStatus} bg={ACTING_BADGE[actingOfficerStatus]?.[0] ?? "#eee"} color={ACTING_BADGE[actingOfficerStatus]?.[1] ?? "#333"} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 10, color: "var(--text-3)", width: 44 }}>HOD</span>
        <Badge label={hodStatus} bg={HOD_BADGE[hodStatus]?.[0] ?? "#eee"} color={HOD_BADGE[hodStatus]?.[1] ?? "#333"} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 10, color: "var(--text-3)", width: 44 }}>MD</span>
        <Badge label={mdStatus} bg={MD_BADGE[mdStatus]?.[0] ?? "#eee"} color={MD_BADGE[mdStatus]?.[1] ?? "#333"} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type View = "my" | "acting" | "hod" | "md";

export default function LeavesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const role: string = currentUser?.role ?? "EMPLOYEE";
  const myEmployeeId: number | null = currentUser?.employeeId ?? null;

  useEffect(() => {
    authClient.getSession().then((result: any) => setCurrentUser(result?.data?.user ?? null));
  }, []);

  const [balance, setBalance] = useState<{ earned: number; taken: number; remaining: number } | null>(null);

  useEffect(() => {
    if (!myEmployeeId) return;
    fetch("/api/leaves/remaining", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setBalance(d.data); })
      .catch(() => {});
  }, [myEmployeeId]);

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("my");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const emptyForm = {
    leaveType: "ANNUAL", startDate: "", endDate: "", reason: "",
    isHalfDay: false, halfDaySession: "FIRST_HALF", actingOfficerId: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [actingSearch, setActingSearch] = useState("");
  const [employeeList, setEmployeeList] = useState<any[]>([]);

  // ── Load data ──────────────────────────────────────────────────────────────
  function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (view === "my")     params.stage = (role === "EMPLOYEE") ? "" : "own";
    if (view === "acting") params.stage = "acting";
    if (view === "hod")    params.stage = "hod";
    if (view === "md")     params.stage = "md";
    if (params.stage === "") delete params.stage;
    api.getLeaves(params).then(d => { setLeaves((d.data as any[]) ?? []); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, [view]);

  useEffect(() => {
    api.getEmployeesForDropdown().then(d => setEmployeeList((d.data as any[]) ?? []));
  }, []);

  // ── Submit new leave ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    if (form.isHalfDay && form.startDate !== form.endDate) {
      setMsg("Half-day requests must have the same start and end date."); setSaving(false); return;
    }
    const res = await api.applyLeave({
      leaveType: form.leaveType, startDate: form.startDate, endDate: form.endDate,
      reason: form.reason, isHalfDay: form.isHalfDay,
      halfDaySession: form.isHalfDay ? form.halfDaySession : "NONE",
      actingOfficerId: form.actingOfficerId || null,
    });
    if (res.success) {
      setMsg("Leave request submitted!"); setShowForm(false);
      setForm(emptyForm); setActingSearch(""); load();
    } else {
      setMsg(res.error ?? "Failed to submit.");
    }
    setSaving(false);
  }

  // ── Stage action helpers ───────────────────────────────────────────────────
  async function actingRespond(id: number, status: "ACCEPTED" | "DECLINED") {
    const res = await api.actingResponse(id, status);
    if (!res.success) setMsg(res.error ?? "Failed."); else load();
  }

  async function hodRespond(id: number, status: "RECOMMENDED" | "NOT_RECOMMENDED") {
    const note = status === "NOT_RECOMMENDED" ? prompt("Reason (optional):") ?? "" : "";
    const res = await api.hodReview(id, status, note);
    if (!res.success) setMsg(res.error ?? "Failed."); else load();
  }

  async function mdRespond(id: number, status: "APPROVED" | "NOT_APPROVED") {
    const note = status === "NOT_APPROVED" ? prompt("Reason (optional):") ?? "" : "";
    const res = await api.mdReview(id, status, note);
    if (!res.success) setMsg(res.error ?? "Failed."); else load();
  }

  // ── Filtered employee dropdown ─────────────────────────────────────────────
  const filteredEmployees = employeeList.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(actingSearch.toLowerCase())
  ).filter(e => e.id !== myEmployeeId); // can't act for yourself

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none", background: "var(--surface)",
  };
  const btn = (accent?: boolean): React.CSSProperties => ({
    padding: "9px 18px", border: accent ? "none" : "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer",
    background: accent ? "var(--accent)" : "var(--surface-2)",
    color: accent ? "white" : "var(--text-2)",
  });

  // ── Tabs config ────────────────────────────────────────────────────────────
  const tabs: { key: View; label: string; show: boolean }[] = [
    { key: "my",     label: role === "HR_ADMIN" ? "All Requests" : "My Requests", show: true },
    { key: "acting", label: "Acting Duties", show: !!myEmployeeId },
    { key: "hod",    label: "HOD Queue",     show: role === "MANAGER" || role === "HR_ADMIN" },
    { key: "md",     label: "MD Approval",   show: role === "HR_ADMIN" },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Leave Requests</h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>Apply and manage leave through the approval pipeline</p>
        </div>
        <button onClick={() => setShowForm(true)} style={btn(true)}>+ Apply for Leave</button>
      </div>

      {/* Leave Balance Card */}
      {balance && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Days Earned", value: balance.earned, color: "var(--accent)" },
            { label: "Days Taken",  value: balance.taken,  color: "var(--warning)" },
            { label: "Remaining",   value: balance.remaining, color: "var(--success)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, padding: "16px 20px", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-sm)", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Message */}
      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13,
          background: msg.includes("!") ? "var(--success-light)" : "var(--danger-light)",
          color: msg.includes("!") ? "var(--success)" : "var(--danger)" }}>
          {msg}
        </div>
      )}

      {/* Apply form */}
      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, marginBottom: 24, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Apply for Leave</h3>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); setActingSearch(""); }} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Leave Type */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Leave Type *</label>
              <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))} style={inp}>
                {["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div />

            {/* Dates */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Start Date *</label>
              <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>End Date *</label>
              <input type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inp} />
            </div>

            {/* Half-day toggle */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={form.isHalfDay}
                  onChange={e => setForm(f => ({ ...f, isHalfDay: e.target.checked, halfDaySession: "FIRST_HALF" }))}
                  style={{ width: 16, height: 16 }}
                />
                Applying for a half day
              </label>
            </div>

            {/* Half-day session (conditional) */}
            {form.isHalfDay && (
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "var(--text-2)" }}>Select Session *</label>
                <div style={{ display: "flex", gap: 20 }}>
                  {(["FIRST_HALF", "SECOND_HALF"] as const).map(s => (
                    <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                      <input
                        type="radio"
                        name="halfDaySession"
                        value={s}
                        checked={form.halfDaySession === s}
                        onChange={() => setForm(f => ({ ...f, halfDaySession: s }))}
                      />
                      {s === "FIRST_HALF" ? "1st Half" : "2nd Half"}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Acting Officer */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Name of the Acting Officer</label>
              <input
                type="text"
                placeholder="Search employee…"
                value={actingSearch}
                onChange={e => setActingSearch(e.target.value)}
                style={{ ...inp, marginBottom: 6 }}
              />
              <select
                value={form.actingOfficerId}
                onChange={e => setForm(f => ({ ...f, actingOfficerId: e.target.value }))}
                style={inp}
              >
                <option value="">— No acting officer —</option>
                {filteredEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} />
            </div>

            <div style={{ gridColumn: "span 2", display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={btn(true)}>{saving ? "Submitting…" : "Submit Request"}</button>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setActingSearch(""); }} style={btn()}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {tabs.filter(t => t.show).map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: view === t.key ? 600 : 400, cursor: "pointer",
            background: "none", border: "none", borderBottom: view === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            color: view === t.key ? "var(--accent)" : "var(--text-2)", marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["Employee", "Type", "Dates", "Half Day", "Pipeline", "Final", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading…</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>No requests found.</td></tr>
            ) : leaves.map((l, i) => {
              const [fbg, fc] = FINAL_BADGE[l.status] ?? ["var(--surface-2)", "var(--text-2)"];
              return (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--bg)" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 500, fontSize: 13 }}>{l.employeeFirstName} {l.employeeLastName}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-2)" }}>{l.leaveType}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-2)" }}>
                    {l.startDate}
                    {l.startDate !== l.endDate && <><br /><span style={{ color: "var(--text-3)" }}>→ {l.endDate}</span></>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-2)" }}>
                    {l.isHalfDay ? (l.halfDaySession === "FIRST_HALF" ? "1st Half" : "2nd Half") : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <PipelineBadge
                      actingOfficerStatus={l.actingOfficerStatus}
                      hodStatus={l.hodStatus}
                      mdStatus={l.mdStatus}
                      hasActing={!!l.actingOfficerId}
                    />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <Badge label={l.status} bg={fbg} color={fc} />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {/* Acting officer buttons */}
                      {view === "acting" && l.actingOfficerId === myEmployeeId && l.actingOfficerStatus === "PENDING" && (
                        <>
                          <button onClick={() => actingRespond(l.id, "ACCEPTED")} style={{ padding: "3px 10px", fontSize: 11, background: "var(--success-light)", color: "var(--success)", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Accept</button>
                          <button onClick={() => actingRespond(l.id, "DECLINED")} style={{ padding: "3px 10px", fontSize: 11, background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Decline</button>
                        </>
                      )}
                      {/* HOD buttons */}
                      {view === "hod" && (role === "MANAGER" || role === "HR_ADMIN") && l.hodStatus === "PENDING" && (
                        <>
                          <button onClick={() => hodRespond(l.id, "RECOMMENDED")} style={{ padding: "3px 10px", fontSize: 11, background: "var(--success-light)", color: "var(--success)", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Recommend</button>
                          <button onClick={() => hodRespond(l.id, "NOT_RECOMMENDED")} style={{ padding: "3px 10px", fontSize: 11, background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Not Recommend</button>
                        </>
                      )}
                      {/* MD buttons */}
                      {view === "md" && role === "HR_ADMIN" && l.mdStatus === "PENDING" && (
                        <>
                          <button onClick={() => mdRespond(l.id, "APPROVED")} style={{ padding: "3px 10px", fontSize: 11, background: "var(--success-light)", color: "var(--success)", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Approve</button>
                          <button onClick={() => mdRespond(l.id, "NOT_APPROVED")} style={{ padding: "3px 10px", fontSize: 11, background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>Not Approve</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
