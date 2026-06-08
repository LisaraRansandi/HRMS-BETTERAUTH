"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";

function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ACTIVE:   ["var(--success-light)", "var(--success)"],
    INACTIVE: ["var(--danger-light)",  "var(--danger)"],
    ON_LEAVE: ["var(--warning-light)", "var(--warning)"],
  };
  const [bg, color] = map[status] ?? ["var(--surface-2)", "var(--text-2)"];
  return <span style={{ padding: "2px 10px", borderRadius: 99, background: bg, color, fontSize: 12, fontWeight: 500 }}>{status}</span>;
}

const emptyRegForm = {
  firstName: "", lastName: "", email: "", phone: "", epfNo: "",
  position: "", departmentId: "", password: "", confirmPassword: "",
  actingOfficerId: "", hodId: "", mdId: "", approvalChainActive: false,
};

export default function EmployeesPage() {
  const [employees, setEmployees]     = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  // Registration form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyRegForm);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  // Edit modal
  const [editEmp, setEditEmp]       = useState<any | null>(null);
  const [editForm, setEditForm]     = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg]       = useState("");

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none", background: "var(--surface)",
  };

  function load(q = "") {
    setLoading(true);
    api.getEmployees(q ? { search: q } : {})
      .then(d => { setEmployees((d.data as any)?.employees ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.getDepartments().then(d => setDepartments((d.data as any) ?? [])).catch(() => {});
    api.getEmployeesForDropdown().then(d => setAllEmployees((d.data as any[]) ?? [])).catch(() => {});
  }, []);

  // ── Registration ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    if (form.password.length < 8) { setMsg("Password must be at least 8 characters."); setSaving(false); return; }
    if (form.password !== form.confirmPassword) { setMsg("Passwords do not match."); setSaving(false); return; }
    const { confirmPassword, ...rest } = form;
    const payload: Record<string, unknown> = { ...rest };
    if (!payload.actingOfficerId) delete payload.actingOfficerId;
    if (!payload.hodId)           delete payload.hodId;
    if (!payload.mdId)            delete payload.mdId;
    const res = await api.createEmployee(payload);
    if (res.success) {
      setMsg("Employee added!"); setShowForm(false); setForm(emptyRegForm); load(search);
    } else {
      setMsg(res.error ?? "Failed to add employee.");
    }
    setSaving(false);
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  async function openEdit(id: number) {
    setEditMsg("");
    setMsg("");
    const res = await api.getEmployee(id);
    if (!res.success) {
      setMsg(res.error ?? "Failed to load employee. Check the browser console for details.");
      return;
    }
    const e = res.data as any;
    setEditForm({
      firstName: e.firstName ?? "", lastName: e.lastName ?? "",
      email: e.email ?? "", phone: e.phone ?? "", epfNo: e.epfNo ?? "",
      position: e.position ?? "", departmentId: e.departmentId ? String(e.departmentId) : "",
      status: e.status ?? "ACTIVE",
      actingOfficerId: e.actingOfficerId ? String(e.actingOfficerId) : "",
      hodId:           e.hodId           ? String(e.hodId)           : "",
      mdId:            e.mdId            ? String(e.mdId)            : "",
      approvalChainActive: e.approvalChainActive ?? false,
    });
    setEditEmp(e);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setEditSaving(true); setEditMsg("");
    const id = editEmp.id;

    const [profileRes, chainRes] = await Promise.all([
      api.updateEmployee(id, {
        firstName:    editForm.firstName,
        lastName:     editForm.lastName,
        email:        editForm.email,
        phone:        editForm.phone    || null,
        epfNo:        editForm.epfNo    || null,
        position:     editForm.position || null,
        departmentId: editForm.departmentId || null,
        status:       editForm.status,
      }),
      api.updateEmployeeChain(id, {
        actingOfficerId: editForm.actingOfficerId ? parseInt(editForm.actingOfficerId) : null,
        hodId:           editForm.hodId           ? parseInt(editForm.hodId)           : null,
        mdId:            editForm.mdId            ? parseInt(editForm.mdId)            : null,
        approvalChainActive: editForm.approvalChainActive,
      }),
    ]);

    const errors = [profileRes, chainRes].filter(r => !r.success).map(r => r.error).join(" | ");
    if (errors) {
      setEditMsg(errors);
    } else {
      setEditEmp(null); load(search);
    }
    setEditSaving(false);
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this employee?")) return;
    await api.deactivateEmployee(id);
    load(search);
  }

  // ── Chain dropdowns shared renderer ────────────────────────────────────────
  function ChainSelects({ values, onChange, excludeId }: {
    values: { actingOfficerId: string; hodId: string; mdId: string; approvalChainActive: boolean };
    onChange: (patch: Partial<typeof values>) => void;
    excludeId?: number;
  }) {
    const opts = allEmployees.filter(e => e.id !== excludeId);
    return (
      <div style={{ gridColumn: "span 2", borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Approval Chain
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          {([
            ["Acting Officer", "actingOfficerId"],
            ["HOD",            "hodId"],
            ["MD / Chairman",  "mdId"],
          ] as [string, keyof typeof values][]).map(([label, key]) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>{label}</label>
              <select
                value={values[key] as string}
                onChange={e => onChange({ [key]: e.target.value })}
                style={inp}
              >
                <option value="">— None —</option>
                {opts.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={values.approvalChainActive}
            onChange={e => onChange({ approvalChainActive: e.target.checked })}
            style={{ width: 15, height: 15 }}
          />
          Mark approval chain as active
        </label>
      </div>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Employees</h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>Manage your staff profiles</p>
        </div>
        <button onClick={() => { setShowForm(true); setMsg(""); }} style={{ padding: "9px 18px", background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          + Add Employee
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: msg.includes("!") ? "var(--success-light)" : "var(--danger-light)", color: msg.includes("!") ? "var(--success)" : "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 18 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          placeholder="Search by name or email…" style={{ ...inp, width: 320 }} />
      </div>

      {/* Registration form */}
      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, marginBottom: 24, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>New Employee</h3>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([
                ["First Name",        "firstName",       "text",     true],
                ["Last Name",         "lastName",        "text",     true],
                ["Email",             "email",           "email",    true],
                ["Phone",             "phone",           "text",     false],
                ["EPF No",            "epfNo",           "text",     false],
                ["Position",          "position",        "text",     false],
                ["Initial Password",  "password",        "password", true],
                ["Confirm Password",  "confirmPassword", "password", true],
              ] as [string, string, string, boolean][]).map(([label, key, type, required]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>{label}{required ? " *" : ""}</label>
                  <input type={type} required={required} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Department</label>
                <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} style={inp}>
                  <option value="">No department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <ChainSelects
                values={{ actingOfficerId: form.actingOfficerId, hodId: form.hodId, mdId: form.mdId, approvalChainActive: form.approvalChainActive }}
                onChange={patch => setForm(f => ({ ...f, ...patch }))}
              />
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {saving ? "Saving…" : "Save Employee"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 20px", background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editEmp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 28, width: "100%", maxWidth: 780, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Edit — {editEmp.firstName} {editEmp.lastName}</h3>
              <button onClick={() => setEditEmp(null)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {editMsg && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--danger-light)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                {editMsg}
              </div>
            )}

            <form onSubmit={handleEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {([
                  ["First Name", "firstName", "text",  true],
                  ["Last Name",  "lastName",  "text",  true],
                  ["Email",      "email",     "email", true],
                  ["Phone",      "phone",     "text",  false],
                  ["EPF No",     "epfNo",     "text",  false],
                  ["Position",   "position",  "text",  false],
                ] as [string, string, string, boolean][]).map(([label, key, type, required]) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>{label}{required ? " *" : ""}</label>
                    <input type={type} required={required} value={editForm[key] ?? ""}
                      onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))} style={inp} />
                  </div>
                ))}

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Department</label>
                  <select value={editForm.departmentId ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, departmentId: e.target.value }))} style={inp}>
                    <option value="">No department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Status</label>
                  <select value={editForm.status ?? "ACTIVE"} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))} style={inp}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                  </select>
                </div>

                <ChainSelects
                  values={{ actingOfficerId: editForm.actingOfficerId ?? "", hodId: editForm.hodId ?? "", mdId: editForm.mdId ?? "", approvalChainActive: editForm.approvalChainActive ?? false }}
                  onChange={patch => setEditForm((f: any) => ({ ...f, ...patch }))}
                  excludeId={editEmp.id}
                />
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button type="submit" disabled={editSaving} style={{ padding: "9px 20px", background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button type="button" onClick={() => setEditEmp(null)} style={{ padding: "9px 20px", background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["Name", "Email", "Position", "Department", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading…</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>No employees found.</td></tr>
            ) : employees.map((emp, i) => (
              <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--bg)" }}>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{emp.firstName} {emp.lastName}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 16px", color: "var(--text-2)", fontSize: 13 }}>{emp.email}</td>
                <td style={{ padding: "13px 16px", color: "var(--text-2)", fontSize: 13 }}>{emp.position || "—"}</td>
                <td style={{ padding: "13px 16px", color: "var(--text-2)", fontSize: 13 }}>{emp.departmentName || "—"}</td>
                <td style={{ padding: "13px 16px" }}><Badge status={emp.status} /></td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(emp.id)} style={{ padding: "4px 12px", fontSize: 12, background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-light)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                      Edit
                    </button>
                    {emp.status === "ACTIVE" && (
                      <button onClick={() => deactivate(emp.id)} style={{ padding: "4px 12px", fontSize: 12, background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
