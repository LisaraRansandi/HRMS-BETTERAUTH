import Sidebar from "./Sidebar";
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: "32px 36px", minHeight: "100vh", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
