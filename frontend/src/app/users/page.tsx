"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  employeeId: number | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
};

const roleStyle: Record<string, [string, string]> = {
  HR_ADMIN: ["#fef3c7", "#92400e"],
  MANAGER:  ["var(--accent-light)", "var(--accent)"],
  EMPLOYEE: ["var(--surface-2)", "var(--text-2)"],
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function load() {
    setLoading(true);
    api.getUsers()
      .then(ud => { setUsers((ud.data as UserRow[]) ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function changeRole(id: string, role: string) {
    const res = await api.updateUser(id, { role });
    if (res.success) { flash("Role updated.", true); load(); }
    else flash(res.error ?? "Failed to update role.", false);
  }

  const inp: React.CSSProperties = {
    padding: "4px 8px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", fontSize: 12,
    background: "var(--surface)", color: "var(--text)",
  };

  return (
    <AppShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>User Accounts</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>Manage roles for employee accounts</p>
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: msg.ok ? "var(--success-light)" : "var(--danger-light)", color: msg.ok ? "var(--success)" : "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["Name / Email", "Linked Employee", "Role"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>No users found.</td></tr>
            ) : users.map((u, i) => {
              const [roleBg, roleColor] = roleStyle[u.role] ?? ["var(--surface-2)", "var(--text-2)"];
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--bg)" }}>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontFamily: "monospace" }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {u.firstName ? (
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{u.firstName} {u.lastName ?? ""}</span>
                        {u.position && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{u.position}</div>}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      style={{ ...inp, background: roleBg, color: roleColor, border: "none", fontWeight: 500, cursor: "pointer", borderRadius: 99 }}
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="HR_ADMIN">HR_ADMIN</option>
                    </select>
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
