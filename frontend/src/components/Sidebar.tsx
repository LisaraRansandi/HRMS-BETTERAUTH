"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type NavItem = { href: string; label: string; icon: string; roles: string[] };

const NAV: NavItem[] = [
  { href: "/dashboard",   label: "Dashboard",   icon: "⊞", roles: ["HR_ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/employees",   label: "Employees",   icon: "◎", roles: ["HR_ADMIN", "MANAGER"] },
  { href: "/departments", label: "Departments", icon: "⊟", roles: ["HR_ADMIN", "MANAGER"] },
  { href: "/leaves",      label: "Leave",        icon: "◷", roles: ["HR_ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/attendance",  label: "Attendance",  icon: "✓", roles: ["HR_ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/users",       label: "Users",        icon: "⊕", roles: ["HR_ADMIN"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("EMPLOYEE");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    authClient.getSession().then((result: any) => {
      const r = result?.data?.user?.role;
      if (r) setRole(r);
    });
  }, []);

  const visibleNav = NAV.filter(item => item.roles.includes(role));

  async function handleLogout() {
    setLoggingOut(true);
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 100 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 16, fontWeight: 700 }}>H</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>HRMS</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Management System</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {visibleNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <a key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-sm)", marginBottom: 2, background: active ? "var(--accent-light)" : "transparent", color: active ? "var(--accent)" : "var(--text-2)", fontWeight: active ? 600 : 400, fontSize: 13.5, transition: "all 0.15s", border: active ? "1px solid #c7d9fb" : "1px solid transparent" }}>
              <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>
      <div style={{ padding: "14px 10px", borderTop: "1px solid var(--border)" }}>
        <button onClick={handleLogout} disabled={loggingOut} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-sm)", background: "transparent", border: "1px solid transparent", color: "var(--text-3)", fontSize: 13.5, transition: "all 0.15s", cursor: "pointer" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--danger-light)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}>
          <span>⎋</span> {loggingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
