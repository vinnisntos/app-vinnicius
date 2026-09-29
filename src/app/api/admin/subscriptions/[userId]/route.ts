import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import { toSubscriptionRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/admin/repository";
import { subscriptionActionSchema } from "@/lib/modules/admin/schema";
import { getProfile } from "@/lib/modules/conta/repository";

/**
 * PATCH /api/admin/subscriptions/:userId
 * body: { action: "approve" | "revoke" | "extend_trial" (days) | "set_notes" }
 */
export const PATCH = apiRoute<"master", { userId: string }>(
  { guard: "master" },
  async ({ userId: masterId, params, body }) => {
    const targetId = z.uuid().parse(params.userId);
    const input = await body(subscriptionActionSchema);

    if (!(await getProfile(targetId))) throw notFound("Usuário");
    const row = await repository.applySubscriptionAction(masterId, targetId, input);
    return toSubscriptionRow(row);
  },
);
