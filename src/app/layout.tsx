import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { CapacitorInit } from "@/components/capacitor-init";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const dmSans = DM_Sans({
 variable: "--font-dm-sans",
 subsets: ["latin"],
});

const fraunces = Fraunces({
 variable: "--font-fraunces",
 subsets: ["latin"],
});

export const metadata: Metadata = {
 title: "Aura & Anchor - Relationship Healing",
 description:
 "A compassionate space for two people to heal, understand, and grow together - guided by Aura & Anchor.",
 manifest: "/manifest.json",
 icons: {
 icon: [
 { url: "/icons/icon.svg", type: "image/svg+xml" },
 { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
 { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
 ],
 apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
 },
 appleWebApp: {
 capable: true,
 statusBarStyle: "default",
 title: "Aura & Anchor",
 },
 other: {
 "mobile-web-app-capable": "yes",
 "apple-mobile-web-app-capable": "yes",
 "apple-mobile-web-app-status-bar-style": "default",
 },
};

export const viewport: Viewport = {
 themeColor: [
 { media: "(prefers-color-scheme: light)", color: "#c4786a" },
 { media: "(prefers-color-scheme: dark)", color: "#1a1816" },
 ],
 width: "device-width",
 initialScale: 1,
 maximumScale: 1,
 viewportFit: "cover",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en" suppressHydrationWarning>
 <body className={`${dmSans.variable} ${fraunces.variable} min-h-screen antialiased`}>
 <CapacitorInit />
 <ThemeProvider
 attribute="class"
 defaultTheme="system"
 enableSystem
 disableTransitionOnChange
 >
 {children}
 </ThemeProvider>
 </body>
 </html>
 );
}
