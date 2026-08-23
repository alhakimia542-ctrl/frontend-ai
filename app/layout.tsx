import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://alhakimai.com'),
  title: {
    default: "Alhakimi AI Search",
    template: "%s | Alhakimi AI Search",
  },
  description: "محرك بحث متقدم مدعوم بالذكاء الاصطناعي، يمنحك إجابات فورية وموثقة من الويب مباشرة. Advanced AI search engine providing instant, cited answers from the web.",
  keywords: ['Alhakimi AI Search', 'Search AI', 'AI Search Engine', 'محرك بحث ذكي', 'الذكاء الاصطناعي', 'Ahmed Alhakimi'],
  authors: [{ name: "Ahmed Alhakimi" }],
  creator: "Ahmed Alhakimi",
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    siteName: 'Alhakimi AI Search',
  },
  verification: {
    google: "FgeZKuHM8eQS_4XOypbLIwejxmysxyqE28h-iYA71Ms",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
