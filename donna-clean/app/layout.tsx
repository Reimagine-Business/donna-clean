import "./globals.css";
import ClientProviders from "./client-providers";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Toaster />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
