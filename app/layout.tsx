import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PawMeet",
  description: "Sociální síť pro milovníky mazlíčků",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased font-sans bg-gray-50 dark:bg-gray-900">
        {children}
      </body>
    </html>
  );
}