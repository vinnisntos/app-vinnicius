import { apiRoute } from "@/lib/api/handler";

/**
 * Status do paywall. O envelope já traz `access`; `data` repete para quem
 * só quer consultar (ex.: polling do countdown do trial).
 */
export const GET = apiRoute({ guard: "user", help: ["route.assinar"] }, async ({ access }) => access);
