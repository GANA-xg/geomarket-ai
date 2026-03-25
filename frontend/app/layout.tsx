import { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoMarket AI",
  description: "AI-powered platform converting geopolitical news into market signals using Buffett value and Wall Street quant factors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased bg-gray-950 text-gray-50 flex flex-col min-h-screen`}>
        <header className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              GeoMarket AI
            </h1>
            <nav className="flex space-x-6">
              <a href="/dashboard" className="hover:text-emerald-400 transition">Dashboard</a>
              <a href="/map" className="hover:text-emerald-400 transition">Geo Map</a>
              <a href="/news" className="hover:text-emerald-400 transition">News</a>
              <a href="/stocks" className="hover:text-emerald-400 transition">Stocks Analysis</a>
              <a href="/portfolio" className="hover:text-emerald-400 transition">Portfolio</a>
            </nav>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 md:p-8">
            {children}
        </main>
        <footer className="bg-gray-900 border-t border-gray-800 p-4 text-center text-gray-500 text-sm">
          GeoMarket AI &copy; 2026. Data is for demonstration purposes.
        </footer>
      </body>
    </html>
  );
}
