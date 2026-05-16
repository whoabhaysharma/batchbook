import type { Metadata, Viewport } from "next";

import { AppFrame } from "@/components/app-frame";
import { FirebaseAnalytics } from "@/components/firebase-analytics";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BatchBook",
    template: "%s — BatchBook",
  },
  description: "BatchBook by Bythub — the professional tuition center management system.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f9ff",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <FirebaseAnalytics />
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
