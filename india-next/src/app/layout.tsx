import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: {
    default: "Indiaesque - Curated India Experiences",
    template: "%s | Indiaesque",
  },
  description: "Discover authentic India through curated experiences. Personalized journeys, heritage walks, and unforgettable adventures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
