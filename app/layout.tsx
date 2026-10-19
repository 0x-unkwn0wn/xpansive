import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xpansive — Una idea. Tres caminos.",
  description: "Explora ideas con IA, descubre tres direcciones y decide cuál seguir.",
  openGraph: {
    title: "Xpansive — Una idea. Tres caminos.",
    description: "Explora ideas con IA, descubre tres direcciones y decide cuál seguir.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
