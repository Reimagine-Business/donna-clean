import { Geist } from "next/font/google";
import "./globals.css";
import ClientProviders from "./client-providers";
export { metadata } from "./metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
