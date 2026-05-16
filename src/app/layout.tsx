import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { AppFrame } from "@/components/app-frame";
import { FirebaseAnalytics } from "@/components/firebase-analytics";
import { AuthProvider } from "@/components/auth-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

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
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <FirebaseAnalytics />
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}

