import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "StockWiz AI",
  description: "AI-powered stock scanner & options strategy advisor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-20 md:pb-4">
            {children}
          </main>
          <NavBar />
        </div>
      </body>
    </html>
  );
}
