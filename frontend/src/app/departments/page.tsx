"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load() { api.getDepartments().then(d => { setDepartments((d.data as any[]) ?? []); setLoading(false); }).catch(() => setLoading(false)); }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    const res = await api.createDepartment(form);
    if (res.success) { setMsg("Department created!"); setShowForm(false); setForm({ name: "", description: "" }); load(); }
    else setMsg(res.error ?? "Failed.");
    setSaving(false);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none", background: "var(--surface)" };

  return (
    <AppShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Departments</h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>Manage company departments</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: "9px 18px", background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ New Department</button>
      </div>

      {msg && <div style={{ marginBottom: 16, padding: "10px 14px", background: msg.includes("!") ? "var(--success-light)" : "var(--danger-light)", color: msg.includes("!") ? "var(--success)" : "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>{msg}</div>}

      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, marginBottom: 24, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>New Department</h3>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Department Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text-2)" }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{saving ? "Saving…" : "Create"}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 20px", background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {loading ? <div style={{ color: "var(--text-3)" }}>Loading…</div>
          : departments.length === 0 ? <div style={{ color: "var(--text-3)" }}>No departments yet.</div>
          : departments.map(d => (
            <div key={d.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 22px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{d.name}</h3>
                <span style={{ padding: "2px 10px", borderRadius: 99, background: "var(--accent-light)", color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>{d.employeeCount} staff</span>
              </div>
              {d.description && <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>{d.description}</p>}
            </div>
          ))}
      </div>
    </AppShell>
  );
}
