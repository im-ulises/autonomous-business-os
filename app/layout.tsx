import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./project-manager.css";
import "./brand-sheet.css";

export const metadata: Metadata = {
  title: "Autonomous Business OS",
  description: "Dirige tus empresas, proyectos y agentes desde una sola consola.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
