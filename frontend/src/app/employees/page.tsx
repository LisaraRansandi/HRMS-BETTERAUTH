"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";

function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ACTIVE: ["var(--success-light)", "var(--success)"],
    INACTIVE: ["var(--danger-light)", "var(--danger)"],
    ON_LEAVE: ["var(--warning-light)", "var(--warning)"]
  };
  const [bg, color] = map[status] ?? ["var(--surface-2)", "var(--text-2)"];
  return <span style={{ padding: "2px 10px", borderRadius: 99, background: bg, color, fontSize: 12, fontWeight: 500 }}>{status}</span>;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    phone: "", epfNo: "", position: "", departmentId: "",
    password: "", confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load(q = "") {
    setLoading(true);
    api.getEmployees(q ? { search: q } : {})
      .then(d => { setEmployees((d.data as any)?.employees ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.getDepartments()
      .then(d => setDepartments((d.data as any) ?? []))
      .catch(() => setDepartments([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    if (form.password.length < 8) {
      setMsg("Password must be at least 8 characters."); setSaving(false); return;
    }
    if (form.password !== form.confirmPassword) {
      setMsg("Passwords do not match."); setSaving(false); return;
    }
    const { confirmPassword, ...employeeData } = form;
    const res = await api.createEmployee(employeeData);
    if (res.success) {
      setMsg("Employee added!");
      setShowForm(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", epfNo: "", position: "", departmentId: "", password: "", confirmPassword: "" });
      load(search);
    } else {
      setMsg(res.error ?? "Failed to add employee.");
    }
    setSaving(false);
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this employee?")) return;
    await api.deactivateEmployee(id);
    load(search);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    fontSize: 13, outline: "none", background: "var(--surface)"
  };

  return (
    <AppShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Employees</h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>Manage your staff profiles</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: "9px 18px", background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          + Add Employee
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: msg.includes("!") ? "var(--success-light)" : "var(--danger-light)", color: msg.includes("!") ? "var(--success)" : "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          placeholder="Search by name or email…" style={{ ...inp, width: 320 }} />
      </div>

      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, marginBottom: 24, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>New Employee</h3>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([
                ["First Name", "firstName", "text", true],
                ["Last Name", "lastName", "text", true],
                ["Email", "email", "email", true],
                ["Phone", "phone", "text", false],
                ["EPF No", "epfNo", "text", false],
                ["Position", "position", "text", false],
                ["Initial Password *", "password", "password", true],
                ["Confirm Password *", "confirmPassword", "password", true],
              ] as [string, string, string, boolean][]).map(([label, key, type, required]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>
                    {label}{required ? " *" : ""}
                  </label>
                  <input
                    type={type}
                    required={required}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inp}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>
                  Department
                </label>
                <select
                  value={form.departmentId}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  style={inp}
                >
                  <option value="">No department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
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

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["Name", "Email", "Position", "Department", "Status", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
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
                  {emp.status === "ACTIVE" && (
                    <button onClick={() => deactivate(emp.id)} style={{ padding: "4px 12px", fontSize: 12, background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
