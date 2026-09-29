import type { NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { getAccessStatus } from "@/lib/access/status";
import { createClient } from "@/lib/supabase/server";
import type {
  AccessStatus,
  ApiEnvelope,
  ApiError,
  ApiErrorCode,
  HelpKey,
} from "@/types/database";
import { getHelp } from "./help";

/**
 * Nível de proteção de uma rota:
 * - public: sem sessão (FAQ, settings públicos, tooltips)
 * - user:   sessão válida, mesmo sem assinatura (perfil, status, checkout)
 * - access: sessão + has_access (trial vigente, assinante ou master) — paywall
 * - master: sessão + role master (painel admin)
 */
export type RouteGuard = "public" | "user" | "access" | "master";

export class ApiHttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

type GuardContext<G extends RouteGuard> = G extends "public"
  ? { userId: string | null; access: AccessStatus | null }
  : { userId: string; access: AccessStatus };

export type RouteContext<G extends RouteGuard, P> = GuardContext<G> & {
  request: NextRequest;
  params: P;
  /** Lê e valida o corpo JSON; erro de validação vira 422 com `fields`. */
  body<T>(schema: ZodType<T>): Promise<T>;
  /** Valida a query string (valores simples; arrays via "a,b,c"). */
  query<T>(schema: ZodType<T>): T;
};

/** Retorno com status diferente de 200 sem abrir mão do envelope. */
export class ApiResult<T> {
  constructor(
    public data: T,
    public status = 200,
  ) {}
}

export const created = <T>(data: T) => new ApiResult(data, 201);

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(status: number, error: ApiError["error"]) {
  return Response.json({ error } satisfies ApiError, { status, headers: NO_STORE });
}

async function resolveSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Wrapper único de Route Handler. Centraliza: sessão (userId sempre da
 * sessão Supabase, nunca do payload), paywall via get_access_status,
 * role master, parse Zod, envelope `ApiEnvelope` e mapeamento de erro.
 *
 * O handler devolve só o `data`; um `Response` devolvido é repassado cru
 * (redirects, webhooks).
 */
export function apiRoute<G extends RouteGuard, P = Record<string, never>>(
  options: { guard: G; help?: HelpKey[] },
  handler: (ctx: RouteContext<G, P>) => Promise<unknown>,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const userId = await resolveSession();

      if (options.guard !== "public" && !userId) {
        throw new ApiHttpError(401, "unauthorized", "Faça login para continuar.");
      }

      const access = userId ? await getAccessStatus(userId) : null;

      if (options.guard === "access" && !access?.has_access) {
        throw new ApiHttpError(402, "paywall", "Seu período de teste terminou. Assine para continuar.");
      }
      if (options.guard === "master" && access?.access_state !== "master") {
        throw new ApiHttpError(403, "forbidden", "Acesso restrito ao administrador.");
      }

      const ctx = {
        userId,
        access,
        request,
        params: await context.params,
        async body<T>(schema: ZodType<T>) {
          let raw: unknown;
          try {
            raw = await request.json();
          } catch {
            throw new ApiHttpError(400, "validation", "JSON inválido.");
          }
          return schema.parse(raw);
        },
        query<T>(schema: ZodType<T>) {
          return schema.parse(Object.fromEntries(request.nextUrl.searchParams));
        },
      } as RouteContext<G, P>;

      const result = await handler(ctx);
      if (result instanceof Response) return result;

      const { data, status } =
        result instanceof ApiResult ? result : new ApiResult(result);
      const help = options.help?.length ? await getHelp(options.help) : undefined;

      return Response.json(
        { data, access, ...(help ? { help } : {}) } satisfies ApiEnvelope<unknown>,
        { status, headers: NO_STORE },
      );
    } catch (error) {
      if (error instanceof ApiHttpError) {
        return errorResponse(error.status, {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        });
      }
      if (error instanceof z.ZodError) {
        return errorResponse(422, {
          code: "validation",
          message: error.issues[0]?.message ?? "Dados inválidos.",
          fields: z.flattenError(error).fieldErrors as Record<string, string[]>,
        });
      }
      // Unique violation (postgres-js direto ou embrulhado pelo Drizzle).
      const pgCode =
        (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
      if (pgCode === "23505") {
        return errorResponse(409, { code: "conflict", message: "Registro já existe." });
      }
      // Next usa exceções para redirect()/notFound() — nunca engolir.
      if (error instanceof Error && "digest" in error) throw error;

      console.error("[api]", request.method, request.nextUrl.pathname, error);
      return errorResponse(500, { code: "internal", message: "Erro inesperado. Tente novamente." });
    }
  };
}

export const notFound = (what = "Registro") =>
  new ApiHttpError(404, "not_found", `${what} não encontrado.`);
