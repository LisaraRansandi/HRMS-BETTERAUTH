"use client";

import Link from "next/link";

export default function SignUpPage() {
  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    background: "var(--surface)", color: "var(--text)", fontSize: 14, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      <div style={{ flex: 1, background: "var(--accent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, color: "white" }}>
        <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.15)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginBottom: 28 }}>H</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>Human Resource<br />Management System</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: 340, textAlign: "center", lineHeight: 1.7, fontSize: 15 }}>
          Employee accounts are created and managed exclusively by the HR Administrator.
        </p>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 300 }}>
          {["Secure account setup", "Admin-controlled access", "Role-based permissions", "Ready to use on day one"].map((feature) => (
            <div key={feature} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.85)", fontSize: 14 }}>
              <span style={{ width: 20, height: 20, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</span>{feature}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 50px", background: "var(--surface)" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Registration Closed</h2>
          <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            Self-registration is not available. Employee accounts are created by the HR Admin with your credentials provided directly to you.
          </p>
          <div style={{ padding: "16px 18px", background: "var(--surface-2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 28 }}>
            <strong style={{ color: "var(--text)", display: "block", marginBottom: 6 }}>How to get access:</strong>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              <li>Contact your HR Administrator</li>
              <li>They will create your account</li>
              <li>You will receive your login credentials</li>
              <li>Sign in using the Login page</li>
            </ol>
          </div>
          <Link
            href="/login"
            style={{ display: "block", textAlign: "center", padding: "11px 0", background: "var(--accent)", color: "white", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
