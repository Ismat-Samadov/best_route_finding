import type { Metadata } from "next";
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
  title: {
    default: "GIF to MP4 Converter - Fast, Free, Browser-Based Conversion",
    template: "%s | GIF to MP4 Converter"
  },
  description: "Convert GIF files to MP4 format instantly with our free, browser-based converter. Fast, secure, and private - no server uploads required. High-quality conversion with FFmpeg.",
  keywords: [
    "gif to mp4",
    "gif converter", 
    "mp4 converter",
    "video converter",
    "free converter",
    "browser converter",
    "ffmpeg",
    "online converter",
    "video format converter",
    "gif to video"
  ],
  authors: [{ name: "Media Converter" }],
  creator: "Media Converter",
  publisher: "Media Converter",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://mediaconverter-one.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GIF to MP4 Converter - Free Online Video Converter",
    description: "Convert your GIF animations to MP4 videos instantly. Fast, secure browser-based conversion with no server uploads required.",
    url: "https://mediaconverter-one.vercel.app",
    siteName: "GIF to MP4 Converter",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GIF to MP4 Converter - Free Online Tool"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "GIF to MP4 Converter - Free Online Video Converter",
    description: "Convert GIF to MP4 instantly in your browser. No uploads, completely private and secure.",
    images: ["/og-image.png"],
    creator: "@mediaconverter"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
