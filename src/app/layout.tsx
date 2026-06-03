import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "votia-gpt",
  description: "Análise eleitoral pré-publicação",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
