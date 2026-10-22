import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Use the Geist files bundled with the pinned Next.js dependency so builds do
// not need network access to fonts.googleapis.com.
const geistSans = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VemGO",
  description: "Serviço rápido. Preço certo. Chama que vem!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-black antialiased`}
    >
      <body className="min-h-full bg-black text-white">
        {children}
      </body>
    </html>
  );
}
