// src/app/layout.tsx
import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context";
import { ReduxProvider } from "@/redux/provider";

// Correct Prompt font configuration
const prompt = Prompt({
  subsets: ["latin", "thai"], // Re-enable thai subset if needed
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
  fallback: ["sans-serif"], // Add proper fallback
});

export const metadata: Metadata = {
  title: "Boxmoji Clinical Portal",
  description: "Medical clinic management system for healthcare professionals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${prompt.variable} font-prompt antialiased`}>
        <ReduxProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}