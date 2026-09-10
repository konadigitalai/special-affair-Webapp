import type { Metadata } from "next";
import "./storefront.css";
import "./flagship.css";

export const metadata: Metadata = {
  title: {
    default: "Special Affair",
    template: "%s | Special Affair",
  },
  description: "The first layer of confidence. A contemporary lifestyle house, crafted for every affair.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
