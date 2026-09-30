import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_CONFIG.lightBackgroundColor },
    { media: "(prefers-color-scheme: dark)", color: APP_CONFIG.backgroundColor },
  ],
  width: "device-width",
  initialScale: 1,
  // Conteúdo sob o notch/home indicator — o layout usa env(safe-area-inset-*).
  viewportFit: "cover",
};

const themeScript = `(()=>{const e=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');function a(){e.classList.toggle('dark',e.dataset.themePreference==='escuro'||(e.dataset.themePreference==='sistema'&&m.matches))}a();m.addEventListener('change',a);window.addEventListener('theme-change',a)})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieTheme = (await cookies()).get("theme")?.value;
  const theme = cookieTheme === "claro" || cookieTheme === "escuro" ? cookieTheme : "sistema";
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="pt-BR"
      className={`${theme === "escuro" ? "dark " : ""}${jetbrainsMono.variable} h-full antialiased`}
      data-theme-preference={theme}
      suppressHydrationWarning
    >
      <head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
