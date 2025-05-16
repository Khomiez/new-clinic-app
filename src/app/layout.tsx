import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context";
import { ReduxProvider } from "@/redux/provider";

// Fix the font configuration
const prompt = Prompt({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
  // Remove the thai subset as it might be causing issues
  // If you need Thai support, try adding it back with a fallback
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
      <body className={`${prompt.variable} font-sans antialiased`}>
        <ReduxProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}