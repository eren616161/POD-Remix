import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/Header";
import FloatingActionButton from "@/components/FloatingActionButton";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Optimized font loading with next/font
// Fonts are automatically hosted on Vercel's edge network
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POD Remix MVP",
  description: "Upload 1 POD design image and generate 4 similar-but-different variants automatically",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`light ${outfit.variable} ${firaCode.variable}`}>
      <body className="antialiased pt-16">
        <AuthProvider>
          <Header />
          {children}
          <FloatingActionButton />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
