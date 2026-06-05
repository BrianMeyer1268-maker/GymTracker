import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Iron Compass",
  applicationName: "Iron Compass",
  description: "Intelligent gym companion — navigate your workout machine by machine",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Iron Compass" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
  // Legacy iOS standalone flag (Next emits the modern `mobile-web-app-capable`).
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <StoreProvider>{children}</StoreProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
