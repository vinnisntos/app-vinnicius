import { apiRoute } from "@/lib/api/handler";
import * as repository from "@/lib/modules/admin/repository";

/** Contagem de assinantes por access_state (cards do painel). */
export const GET = apiRoute({ guard: "master" }, async () => repository.getAccessOverview());
