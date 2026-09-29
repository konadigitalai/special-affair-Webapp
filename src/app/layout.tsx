import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./storefront.css";
import "./flagship.css";

const instrumentSans = localFont({
  src: "./fonts/InstrumentSans-Variable.ttf",
  variable: "--font-body",
  weight: "400 700",
  display: "swap",
});

const istokDisplay = localFont({
  src: "./fonts/IstokWeb-Bold.ttf",
  variable: "--font-display",
  weight: "700",
  display: "swap",
});

const interSubheading = localFont({
  src: "./fonts/Inter28-Bold.ttf",
  variable: "--font-subheading",
  weight: "700",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Special Affair",
    template: "%s | Special Affair",
  },
  description: "The first layer of confidence. A contemporary lifestyle house, crafted for every affair.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${instrumentSans.variable} ${istokDisplay.variable} ${interSubheading.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
