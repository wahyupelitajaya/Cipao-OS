import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-elegant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cipao OS",
  description: "Cipao Operational System — operational console for multi-cat households",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

