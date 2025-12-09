// Temporarily commented out due to build environment network restrictions
// import { Geist } from "next/font/google";
import "./globals.css";
import ClientProviders from "./client-providers";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   display: "swap",
//   subsets: ["latin"],
// });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
