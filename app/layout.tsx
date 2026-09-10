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
    default: "كاشف | Kashef AI",
    template: "%s | كاشف AI",
  },
  description: "محرك كاشف الذكي للبحث والتحليل الفوري المدعوم بالذكاء الاصطناعي.",
  keywords: ["كاشف", "Kashef AI", "محرك بحث ذكي", "كاشف للبحث", "AI Search Engine", "Alhakim AI", "الذكاء الاصطناعي", "Ahmed Alhakimi"],
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
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "كاشف AI",
              "alternateName": ["Kashef AI", "كاشف"],
              "url": "https://alhakimai.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://alhakimai.com/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
