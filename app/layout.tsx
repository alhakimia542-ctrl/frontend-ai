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
    default: "Kashef AI | محرك كاشف الذكي للبحث",
    template: "%s | Kashef AI",
  },
  description: "محرك بحث متقدم مدعوم بالذكاء الاصطناعي، يمنحك إجابات فورية وموثقة من الويب مباشرة. Advanced AI search engine providing instant, cited answers from the web.",
  keywords: ['Alhakimi AI Search', 'Search AI', 'AI Search Engine', 'محرك بحث ذكي', 'الذكاء الاصطناعي', 'Ahmed Alhakimi', 'Kashef AI', 'كاشف', 'محرك بحث كاشف'],
  authors: [{ name: "Ahmed Alhakimi" }],
  creator: "Ahmed Alhakimi",
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    siteName: 'Kashef AI',
  },
  verification: {
    google: "FgeZKuHM8eQS_4XOypbLIwejxmysxyqE28h-iYA71Ms",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><rect width='36' height='36' rx='10' fill='%2318181B'/><path d='M11 9V27M25 9L16 18L25 27M15 17L23 27' stroke='%23FBBF24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>",
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
