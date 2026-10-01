"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function SiteStickyCta({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 280);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <div aria-hidden={!visible} className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-glass p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition duration-200 md:hidden ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}>
    <Link href="/cadastro" tabIndex={visible ? 0 : -1} className="site-cta w-full">{label}</Link>
  </div>;
}
