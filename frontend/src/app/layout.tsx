import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { SITE } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "UNIVERS GRAVURE — Trophées, gravure et impression à Abidjan",
    template: "%s | UNIVERS GRAVURE",
  },
  description: SITE.description,
  keywords: [
    "trophées Côte d'Ivoire", "trophées Abidjan", "gravure Abidjan", "médaille personnalisée", "impression Abidjan",
    "gravure sur objet", "trophée personnalisé", "plaque personnalisée", "cadeaux d'entreprise", "impression professionnelle",
  ],
  openGraph: {
    type: "website",
    locale: "fr_CI",
    siteName: "UNIVERS GRAVURE",
    title: "UNIVERS GRAVURE — Nous donnons une forme à vos récompenses",
    description: SITE.description,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
