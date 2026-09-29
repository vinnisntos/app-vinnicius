import { apiRoute } from "@/lib/api/handler";
import { toPublicSettings } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/conta/repository";
import type { PublicSettings } from "@/types/database";

export const GET = apiRoute(
  { guard: "public" },
  async (): Promise<PublicSettings> => toPublicSettings(await repository.getAppSettings()),
);
