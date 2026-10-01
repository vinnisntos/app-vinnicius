import { apiRoute } from "@/lib/api/handler";
import { exportUserData } from "@/lib/modules/conta/export";

/**
 * GET /api/me/export — baixa todos os dados do próprio usuário em JSON
 * (LGPD). guard "user": mesmo sem assinatura a pessoa tem direito aos dados.
 */
export const GET = apiRoute({ guard: "user" }, async ({ userId }) => {
  const data = await exportUserData(userId);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
