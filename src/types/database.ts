/**
 * Contrato de dados do SaaS (migration 0003_saas_foundation.sql).
 *
 * - `*Row`: linha como existe no banco, em snake_case — mesmo shape que o
 *   supabase-js/PostgREST devolve e que as rotas de API serializam.
 * - `numeric` do Postgres é tipado como `number`. Via Drizzle ele chega como
 *   string: o repository converte com `Number()` antes de sair da camada.
 * - Datas `date` são ISO "YYYY-MM-DD"; `timestamptz` são ISO 8601 completos.
 *   Nunca `Date` no contrato (ver nota de fuso em alimentacao/calculations.ts).
 *
 * Os schemas Drizzle (src/lib/db/schema/) espelham as mesmas tabelas em
 * camelCase para uso server-side.
 */

type Uuid = string;
type IsoDate = string; // "YYYY-MM-DD"
type IsoTimestamp = string; // "2026-09-29T20:59:44.801Z"

// =========================================================================
// Enums (check constraints em texto) — arrays reaproveitáveis em z.enum()
// =========================================================================

export const USER_ROLES = ["master", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "revoked",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const ACCESS_STATES = [
  "master",
  "active",
  "trial",
  "expired",
  "revoked",
] as const;
export type AccessState = (typeof ACCESS_STATES)[number];

export const NUTRITION_GOALS = ["emagrecer", "manter", "ganhar"] as const;
export type NutritionGoal = (typeof NUTRITION_GOALS)[number];

export const SEXES = ["M", "F"] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITY_LEVELS = [
  "sedentario",
  "leve",
  "moderado",
  "ativo",
  "muito_ativo",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const MEAL_SLOTS = [
  "cafe_da_manha",
  "almoco",
  "lanche",
  "jantar",
  "ceia",
] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const POST_VISIBILITIES = ["public", "private"] as const;
export type PostVisibility = (typeof POST_VISIBILITIES)[number];

export const REACTION_KINDS = ["apoio", "forca", "inspirador"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

/** Chave de tooltip: 'meal_logs.calories' | 'route.alimentacao' | 'metric.tdee'. */
export type HelpKey = `${string}.${string}`;

// =========================================================================
// Usuários e acesso
// =========================================================================

export interface ProfileRow {
  id: Uuid; // = auth.users.id
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  role: UserRole; // só master altera
  email: string | null; // sincronizado do Auth, não editável pelo usuário
  phone: string | null; // só dígitos, 10–13
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

/** Campos que o próprio usuário pode editar no perfil. */
export type ProfileUpdate = Partial<
  Pick<ProfileRow, "full_name" | "avatar_url" | "timezone" | "phone">
>;

/** Perfil público do autor no feed (RPC get_community_profiles). */
export type CommunityProfile = Pick<ProfileRow, "id" | "full_name" | "avatar_url">;

export interface SubscriptionRow {
  user_id: Uuid;
  status: SubscriptionStatus;
  is_active_subscription: boolean; // gerada: status = 'active'
  trial_ends_at: IsoTimestamp;
  current_period_end: IsoTimestamp | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  approved_by: Uuid | null;
  approved_at: IsoTimestamp | null;
  revoked_at: IsoTimestamp | null;
  admin_notes: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

/** Ações do painel admin (master) sobre uma assinatura. */
export type SubscriptionAdminUpdate = Partial<
  Pick<
    SubscriptionRow,
    "status" | "trial_ends_at" | "current_period_end" | "admin_notes"
  >
>;

/** Retorno de get_access_status(user_id) — fonte única do paywall. */
export interface AccessStatus {
  access_state: AccessState;
  has_access: boolean;
  is_trial: boolean;
  /** true durante o trial → front força pop-ups/banners de escassez. */
  show_nag_screen: boolean;
  is_active_subscription: boolean;
  trial_ends_at: IsoTimestamp | null;
  /** Relógio do servidor para countdown sem depender do aparelho. */
  server_now: IsoTimestamp;
}

export interface AppSettingsRow {
  id: true;
  trial_days: number;
  support_whatsapp: string | null; // só dígitos, com DDI (5511999998888)
  support_whatsapp_message: string | null;
  asaas_checkout_url: string | null;
  updated_at: IsoTimestamp;
}

// =========================================================================
// Alimentação
// =========================================================================

export interface NutritionProfileRow {
  user_id: Uuid;
  sex: Sex;
  birth_date: IsoDate;
  height_cm: number;
  activity_level: ActivityLevel;
  formula: "mifflin_st_jeor";
  calorie_goal: number; // meta manual; recomendação é derivada
  water_goal_ml: number;
  goal: NutritionGoal;
  target_weight_kg: number | null;
  updated_at: IsoTimestamp;
}

export interface WeightLogRow {
  id: Uuid;
  user_id: Uuid;
  logged_at: IsoDate; // único por usuário/dia
  weight_kg: number;
}

export interface MealLogRow {
  id: Uuid;
  user_id: Uuid;
  log_date: IsoDate;
  meal_slot: MealSlot; // único por usuário/dia/slot → chave do upsert
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  is_completed: boolean;
  completed_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp; // last-write-wins no sync otimista
}

/** Payload do front para upsert de refeição (id gerado no cliente). */
export type MealLogUpsert = Pick<MealLogRow, "id" | "log_date" | "meal_slot"> &
  Partial<
    Pick<
      MealLogRow,
      | "description"
      | "calories"
      | "protein_g"
      | "carbs_g"
      | "fat_g"
      | "is_completed"
    >
  >;

export interface WaterLogRow {
  id: Uuid; // gerado no cliente → insert idempotente em retry
  user_id: Uuid;
  log_date: IsoDate;
  amount_ml: number; // incremento; total do dia = soma
  logged_at: IsoTimestamp;
}

export type WaterLogInsert = Pick<WaterLogRow, "id" | "log_date" | "amount_ml">;

/** Métricas derivadas (nunca persistidas) devolvidas pela API de nutrição. */
export interface NutritionMetrics {
  bmr_kcal: number;
  tdee_kcal: number;
  recommended_kcal: number; // TDEE ajustado por `goal`
  consumed_kcal: number;
  remaining_kcal: number;
  water_total_ml: number;
  water_goal_ml: number;
}

// =========================================================================
// Comunidade
// =========================================================================

export interface PostRow {
  id: Uuid;
  user_id: Uuid; // autor
  meal_log_id: Uuid | null;
  body: string | null; // até 2000 chars
  visibility: PostVisibility;
  is_hidden: boolean; // moderação, só master
  hidden_reason: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export type PostInsert = Pick<PostRow, "body" | "meal_log_id"> &
  Partial<Pick<PostRow, "id" | "visibility">>;

export interface PostReactionRow {
  post_id: Uuid;
  user_id: Uuid;
  kind: ReactionKind;
  created_at: IsoTimestamp;
}

/** Item do feed já montado pela API. */
export interface FeedPost {
  post: PostRow;
  author: CommunityProfile;
  meal: Pick<
    MealLogRow,
    "meal_slot" | "log_date" | "description" | "calories" | "protein_g" | "carbs_g" | "fat_g"
  > | null;
  reaction_counts: Partial<Record<ReactionKind, number>>;
  my_reaction: ReactionKind | null;
}

// =========================================================================
// Ajuda
// =========================================================================

export interface FaqItemRow {
  id: Uuid;
  question: string;
  answer: string;
  category: string | null;
  order_index: number;
  is_published: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface HelpTooltipRow {
  key: HelpKey;
  title: string | null;
  body: string;
  faq_item_id: Uuid | null;
  updated_at: IsoTimestamp;
}

export type HelpTooltipMap = Record<HelpKey, Pick<HelpTooltipRow, "title" | "body" | "faq_item_id">>;

// =========================================================================
// Integrações (0004)
// =========================================================================

export const REMINDER_KINDS = ["treino", "refeicoes", "agua", "pesagem"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export interface CalendarReminderRow {
  id: Uuid;
  user_id: Uuid;
  kind: ReminderKind; // único por usuário
  title: string;
  days_of_week: number[]; // 0 = domingo … 6 = sábado
  local_time: string; // "HH:MM" no `timezone`
  duration_minutes: number;
  timezone: string;
  google_event_id: string | null;
  is_active: boolean;
  synced_at: IsoTimestamp | null;
  last_sync_error: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export type CalendarReminderUpsert = Pick<
  CalendarReminderRow,
  "title" | "days_of_week" | "local_time"
> &
  Partial<Pick<CalendarReminderRow, "duration_minutes" | "is_active">>;

/** GET /api/reminders */
export interface RemindersResponse {
  reminders: CalendarReminderRow[];
  google: GoogleCalendarStatus;
}

/** GET /api/integrations/google — token nunca sai do servidor. */
export interface GoogleCalendarStatus {
  connected: boolean;
  google_email: string | null;
  connected_at: IsoTimestamp | null;
  /** false quando GOOGLE_CLIENT_ID/SECRET não estão configurados no server. */
  available: boolean;
}

// =========================================================================
// Payloads compostos das rotas
// =========================================================================

/** GET /api/settings — seguro sem login. */
export interface PublicSettings {
  trial_days: number;
  /** https://wa.me/<numero>?text=<mensagem> — fallback de suporte humano. */
  support_whatsapp_url: string | null;
}

/** GET /api/me */
export interface MeResponse {
  profile: ProfileRow;
  subscription: SubscriptionRow | null;
}

/** GET /api/nutrition/day?date=YYYY-MM-DD */
export interface NutritionDay {
  date: IsoDate;
  profile: NutritionProfileRow | null;
  latest_weight: WeightLogRow | null;
  /** Sempre os 5 slots, na ordem de MEAL_SLOTS; `meal` null = ainda não registrado. */
  meals: { meal_slot: MealSlot; meal: MealLogRow | null }[];
  water_logs: WaterLogRow[];
  /** null enquanto não houver perfil nutricional + ao menos uma pesagem. */
  metrics: NutritionMetrics | null;
}

/** GET /api/community/feed?cursor= */
export interface FeedPage {
  items: FeedPost[];
  /** Passar em ?cursor= para a próxima página; null = fim. */
  next_cursor: string | null;
}

/** Linha do painel master (GET /api/admin/subscriptions). */
export interface AdminSubscriptionItem {
  profile: Pick<ProfileRow, "id" | "full_name" | "email" | "phone" | "role" | "created_at">;
  subscription: SubscriptionRow | null;
  access_state: AccessState;
}

export type AdminSubscriptionAction =
  | { action: "approve"; admin_notes?: string }
  | { action: "revoke"; admin_notes?: string }
  | { action: "extend_trial"; days: number; admin_notes?: string }
  | { action: "set_notes"; admin_notes: string };

/**
 * POST /api/billing/checkout — body opcional. `cpf` só é exigido na 1ª
 * assinatura (o Asaas exige CPF para criar o cliente); se faltar, a rota
 * responde 422 com `fields.cpf`. O CPF é repassado ao Asaas e não é salvo.
 */
export interface CheckoutRequest {
  cpf?: string;
}

/** POST /api/billing/checkout */
export interface CheckoutResponse {
  /** Página de pagamento do Asaas (Pix/boleto/cartão) — abrir em nova aba. */
  checkout_url: string;
}

// =========================================================================
// Envelope padrão das rotas de API
// =========================================================================

/**
 * Envelope de toda rota de `/api` (ver src/lib/api/handler.ts): `access`
 * (paywall/nag) vem em toda resposta autenticada — null só em rota pública
 * sem sessão — e `help` traz os tooltips das chaves que a tela usa, sem
 * request extra.
 */
export interface ApiEnvelope<T> {
  data: T;
  access: AccessStatus | null;
  help?: Partial<HelpTooltipMap>;
}

export type ApiErrorCode =
  | "unauthorized" // 401 — sem sessão
  | "paywall" // 402 — trial expirado/revogado
  | "forbidden" // 403 — não é master / não é dono
  | "not_found" // 404
  | "conflict" // 409
  | "rate_limited" // 429
  | "validation" // 400/422 — `fields` traz erros por campo
  | "upstream" // 502 — Asaas/Google falharam
  | "internal"; // 500

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
}

// =========================================================================
// Mapa de tabelas (útil para genéricos de repository/admin)
// =========================================================================

export interface PublicTables {
  profiles: ProfileRow;
  subscriptions: SubscriptionRow;
  app_settings: AppSettingsRow;
  nutrition_profile: NutritionProfileRow;
  weight_logs: WeightLogRow;
  meal_logs: MealLogRow;
  water_logs: WaterLogRow;
  posts: PostRow;
  post_reactions: PostReactionRow;
  faq_items: FaqItemRow;
  help_tooltips: HelpTooltipRow;
  calendar_reminders: CalendarReminderRow;
}

export type TableName = keyof PublicTables;
