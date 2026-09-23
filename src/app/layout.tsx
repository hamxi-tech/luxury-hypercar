import type { Metadata, Viewport } from "next";
import { Anybody, Familjen_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elström Aubade",
  description:
    "A flagship digital experience for a fictional hypercar house. Real-time 3D, a scroll-directed camera and a configurator, built to show what a luxury automotive website can be.",
  metadataBase: new URL("https://elstrom.example"),
  openGraph: {
    title: "Elström Aubade",
    description:
      "Performance that thinks. A fictional hypercar, presented as a flagship web experience.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "The Elström Aubade in a dark hall, headlamps lit." }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0d11",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anybody.variable} ${familjen.variable} ${geistMono.variable} lenis`}
    >
      <head>
        {/* The car starts downloading with the HTML instead of after the three.js chunk. */}
        <link rel="preload" href="/models/aubade.glb" as="fetch" crossOrigin="anonymous" media="(pointer: fine)" />
        <link rel="preload" href="/models/aubade-lite.glb" as="fetch" crossOrigin="anonymous" media="(pointer: coarse)" />
        <link rel="preload" href="/draco/draco_decoder.wasm" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-graphite text-ivory">{children}</body>
    </html>
  );
}
