import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/lib/app-config";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: APP_CONFIG.name,
  title: {
    default: APP_CONFIG.name,
    template: `%s · ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
  robots: { index: false, follow: false },
  // iOS não lê o manifest para o modo standalone — precisa destas metas.
  appleWebApp: {
    capable: true,
    title: APP_CONFIG.shortName,
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/pwa-icon/192" },
};

export const viewport: Viewport = {
  themeColor: APP_CONFIG.backgroundColor,
  width: "device-width",
  initialScale: 1,
  // Conteúdo sob o notch/home indicator — o layout usa env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
