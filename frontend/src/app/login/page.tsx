"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const registered = searchParams.get("registered") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { error: authError } = await authClient.signIn.email({
        email: form.email,
        password: form.password,
      });
      if (authError) { 
        setError(authError.message ?? "Invalid credentials"); 
        return; 
      }
      router.push("/dashboard");
    } catch (err) { 
      console.error("Login error:", err);
      setError("Something went wrong. Try again."); 
    } finally { 
      setLoading(false); 
    }
  }

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
          Manage your people, departments, attendance, and leave — all in one place.
        </p>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 300 }}>
          {["Employee Profiles", "Leave Management", "Attendance Tracking", "Role-Based Access"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.85)", fontSize: 14 }}>
              <span style={{ width: 20, height: 20, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 50px", background: "var(--surface)" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: "var(--text-2)", marginBottom: 32, fontSize: 14 }}>Sign in to your account</p>
          {registered && (
            <div style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", background: "var(--success-light)", color: "var(--success)", border: "1px solid #bbf7d0", marginBottom: 20, fontSize: 13 }}>
              Account created successfully. You can sign in now.
            </div>
          )}
          {error && (
            <div style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #fecaca", marginBottom: 20, fontSize: 13 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Enter your email"
                style={inp}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password</label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter your password"
                style={inp}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{ marginTop: 8, padding: "11px 0", background: loading ? "#93aef5" : "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text-3)" }}>
            💡 Open browser console (F12) to see detailed errors
          </div>
          <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
            Account access is managed by your HR Administrator.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}