import type { Metadata } from "next";
import { TipsBrowser } from "@/components/tips/tips-browser";
export const metadata: Metadata = { title: "Dicas" };
export default function DicasPage() { return <TipsBrowser/>; }
