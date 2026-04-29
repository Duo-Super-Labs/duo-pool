import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron, Space_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const fontSansLight = Inter({
  subsets: ["latin"],
  variable: "--font-sans-light",
});
const fontSansDark = Orbitron({
  subsets: ["latin"],
  variable: "--font-sans-dark",
});
const fontMonoLight = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-light",
});
const fontMonoDark = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono-dark",
});

export const metadata: Metadata = {
  title: "DuoPool — Live Polls",
  description: "Engenharia de Contexto · Univali talk demo app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark h-full">
      <body
        className={`${fontSansLight.variable} ${fontSansDark.variable} ${fontMonoLight.variable} ${fontMonoDark.variable} min-h-full flex flex-col antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
