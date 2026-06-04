import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRMS — Human Resource Management",
  description: "Internal HR Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
