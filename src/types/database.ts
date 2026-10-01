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

/** Resposta a "Você usa medicação para emagrecer prescrita pelo seu médico?" */
export const MEDICATION_STATUSES = ["usa", "nao_usa", "vai_comecar"] as const;
export type MedicationStatus = (typeof MEDICATION_STATUSES)[number];

export const BILLING_PLAN_IDS = ["mensal", "anual", "fundador"] as const;
export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export const CANCEL_REASONS = ["preco", "nao_uso", "faltou_recurso", "parei_tratamento", "problema_tecnico", "outro"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

/** Versão do texto de consentimento de dados de saúde aceito no cadastro. */
export const HEALTH_CONSENT_VERSION = "2026-10";
export const HEALTH_CONSENT_TEXT =
  "Autorizo o tratamento dos meus dados de saúde (peso, medidas, alimentação, medicação e sintomas) para o funcionamento do app, conforme a Política de Privacidade. Posso exportar ou excluir meus dados quando quiser.";

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
  medication_status: MedicationStatus | null;
  /** Consentimento específico para dados de saúde (LGPD). */
  health_consent_at: IsoTimestamp | null;
  /** null = ainda não passou pelo assistente de boas-vindas. */
  onboarding_completed_at: IsoTimestamp | null;
  sound_enabled: boolean;
  haptics_enabled: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

/** Campos que o próprio usuário pode editar no perfil. */
export type ProfileUpdate = Partial<
  Pick<ProfileRow, "full_name" | "avatar_url" | "timezone" | "phone" | "sound_enabled" | "haptics_enabled" | "medication_status">
> & {
  /** true marca o assistente de boas-vindas como concluído (ou pulado). */
  onboarding_completed?: boolean;
};

/** POST /api/me/password */
export interface PasswordChange {
  current_password: string;
  new_password: string;
}

/** DELETE /api/me — exclusão da conta pelo próprio usuário (LGPD). */
export interface AccountDeletion {
  /** Precisa ser exatamente "EXCLUIR". */
  confirm: "EXCLUIR";
  password: string;
}

/** POST /api/billing/cancel */
export interface CancelSubscriptionResponse {
  cancel_requested_at: IsoTimestamp;
  /** Acesso continua até aqui (null = termina agora). */
  access_until: IsoTimestamp | null;
}

/** Perfil público do autor no feed (RPC get_community_profiles). */
export type CommunityProfile = Pick<ProfileRow, "id" | "full_name" | "avatar_url">;

export interface SubscriptionRow {
  user_id: Uuid;
  status: SubscriptionStatus;
  is_active_subscription: boolean; // gerada: status = 'active'
  trial_ends_at: IsoTimestamp;
  current_period_end: IsoTimestamp | null;
  plan: BillingPlanId | null;
  /** false = pagamento único (fundador): expira no fim do período. */
  auto_renew: boolean;
  cancel_reason: CancelReason | null;
  /** Cancelamento pedido pelo usuário: acesso vale até current_period_end. */
  cancel_requested_at: IsoTimestamp | null;
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
  /**
   * Meta em destaque: "proteina" para quem usa medicação (o déficit de
   * calorias deixa de ser o número principal), "calorias" para os demais.
   */
  focus: "proteina" | "calorias";
  /** Mínimo diário seguro de calorias (1200 F / 1500 M). */
  min_kcal: number;
  /** true = "hoje você comeu pouco" (abaixo do mínimo, só para quem usa medicação). */
  low_intake_warning: boolean;
  /** Metas de macros derivadas da meta calórica (proteína por kg de peso). */
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  /** Consumido = soma das refeições concluídas do dia. */
  protein_g: number;
  carbs_g: number;
  fat_g: number;
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

export const REMINDER_KINDS = ["treino", "refeicoes", "agua", "pesagem", "medicacao"] as const;
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
  meals: { meal_slot: MealSlot; meal: MealLogRow | null; items: MealLogItemRow[] }[];
  water_logs: WaterLogRow[];
  /** null enquanto não houver perfil nutricional + ao menos uma pesagem. */
  metrics: NutritionMetrics | null;
}

/** Próxima ação sugerida no Dashboard (regra em lib/modules/dashboard/next-action.ts). */
export type NextAction =
  | { kind: "setup_profile" }
  | { kind: "log_meal"; meal_slot: MealSlot; overdue: boolean }
  | { kind: "drink_water"; suggested_ml: number; behind_ml: number }
  | { kind: "log_weight" }
  | { kind: "log_medication"; medication_id: Uuid; name: string }
  | { kind: "all_done" };

export interface NextReminder {
  kind: ReminderKind;
  title: string;
  date: IsoDate;
  time: string; // "HH:MM" no fuso do usuário
}

/**
 * GET /api/dashboard/summary — responde, sem rolar, "quanto me resta" e
 * "o que faço agora".
 */
export interface DashboardSummary {
  date: IsoDate;
  now_time: string; // "HH:MM" no fuso do usuário
  first_name: string | null;
  metrics: NutritionMetrics | null;
  next_action: NextAction;
  next_reminder: NextReminder | null;
  /** Último peso — ponto de partida do Stepper de pesagem. */
  latest_weight_kg: number | null;
  /** Treino de hoje no programa ativo (null sem programa). */
  today_workout: { title: string; program_title: string; estimated_minutes: number | null; done_today: boolean } | null;
  /** Dica do dia (rotaciona pelas publicadas). */
  daily_tip: Pick<TipRow, "id" | "title" | "category" | "read_minutes"> | null;
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
  /** Padrão: "mensal". */
  plan?: BillingPlanId;
}

/** Plano como exibido na vitrine e na tela de assinatura. */
export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  price: number;
  months: number;
  /** false = pagamento único, sem renovação. */
  recurring: boolean;
  pix_only: boolean;
  monthly_equivalent: number;
  /** Vagas restantes (só no fundador); 0 = esgotado. */
  seats_left: number | null;
}

/** GET /api/billing/plans — público. */
export interface PlansResponse {
  plans: BillingPlan[];
  trial_days: number;
}

/** POST /api/billing/cancel — motivo opcional (medição de cancelamento). */
export interface CancelSubscriptionRequest {
  reason?: CancelReason;
  note?: string;
}

/** GET /api/admin/funnel?days=30 — funil cadastro → ativação → pagamento. */
export interface FunnelResponse {
  days: number;
  signups: number;
  /** Cadastros que registraram ao menos 1 refeição ou aplicação. */
  activated: number;
  with_medication: number;
  trials_running: number;
  trials_ended: number;
  subscribed: number;
  canceled: number;
  /** subscribed / (subscribed + trials_ended), em %. null sem base. */
  trial_conversion_pct: number | null;
  by_plan: Partial<Record<BillingPlanId, number>>;
  by_source: { source: string; signups: number; subscribed: number }[];
  cancel_reasons: Partial<Record<CancelReason, number>>;
  founder: { total: number; sold: number; left: number };
}

/** POST /api/billing/checkout */
export interface CheckoutResponse {
  /** Página de pagamento do Asaas (Pix/boleto/cartão) — abrir em nova aba. */
  checkout_url: string;
}

// =========================================================================
// Medicação / peptídeos (0005) — o app REGISTRA a prescrição, nunca sugere dose
// =========================================================================

export const MEDICATION_CATEGORIES = ["glp1", "peptideo", "hormonal", "outro"] as const;
export type MedicationCategory = (typeof MEDICATION_CATEGORIES)[number];

export const MEDICATION_ROUTES = ["subcutanea", "oral", "intramuscular", "topica", "outra"] as const;
export type MedicationRoute = (typeof MEDICATION_ROUTES)[number];

export const DOSE_UNITS = ["mg", "mcg", "ui", "ml", "comprimido", "clique"] as const;
export type DoseUnit = (typeof DOSE_UNITS)[number];

export const MEDICATION_FREQUENCIES = ["diaria", "semanal", "quinzenal", "personalizada"] as const;
export type MedicationFrequency = (typeof MEDICATION_FREQUENCIES)[number];

export const INJECTION_SITES = [
  "abdomen_esq",
  "abdomen_dir",
  "coxa_esq",
  "coxa_dir",
  "braco_esq",
  "braco_dir",
  "gluteo_esq",
  "gluteo_dir",
] as const;
export type InjectionSite = (typeof INJECTION_SITES)[number];

export const SIDE_EFFECTS = [
  "nausea",
  "vomito",
  "diarreia",
  "constipacao",
  "azia",
  "dor_abdominal",
  "fadiga",
  "dor_cabeca",
  "tontura",
  "perda_apetite",
  "reacao_local",
  "outro",
] as const;
export type SideEffect = (typeof SIDE_EFFECTS)[number];

/** Aviso obrigatório em toda tela de medicação. */
export const MEDICATION_DISCLAIMER =
  "Siga sempre a orientação do seu médico. Este app não substitui acompanhamento médico e nunca sugere ou altera doses.";

export interface MedicationRow {
  id: Uuid;
  user_id: Uuid;
  name: string;
  category: MedicationCategory;
  route: MedicationRoute;
  dose_amount: number | null; // dose PRESCRITA informada pelo usuário
  dose_unit: DoseUnit;
  frequency: MedicationFrequency;
  days_of_week: number[] | null; // 0 = domingo … 6 = sábado
  started_on: IsoDate | null;
  is_active: boolean;
  prescribed_by: string | null;
  notes: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export type MedicationUpsert = Pick<MedicationRow, "name" | "category" | "route" | "dose_unit" | "frequency"> &
  Partial<Pick<MedicationRow, "dose_amount" | "days_of_week" | "started_on" | "is_active" | "prescribed_by" | "notes">>;

export interface MedicationLogRow {
  id: Uuid;
  user_id: Uuid;
  medication_id: Uuid;
  log_date: IsoDate;
  taken_at: IsoTimestamp;
  dose_amount: number | null;
  dose_unit: DoseUnit | null;
  injection_site: InjectionSite | null;
  side_effects: SideEffect[];
  severity: 0 | 1 | 2 | 3; // nenhum · leve · moderado · forte
  notes: string | null;
  created_at: IsoTimestamp;
}

/** POST /api/medications/:id/logs — `id` gerado no cliente (idempotente). */
export type MedicationLogInsert = Pick<MedicationLogRow, "id" | "log_date"> &
  Partial<Pick<MedicationLogRow, "dose_amount" | "dose_unit" | "injection_site" | "side_effects" | "severity" | "notes">>;

export interface MedicationOverview {
  medication: MedicationRow;
  last_log: MedicationLogRow | null;
  /** Próxima data prevista pela frequência cadastrada (null = sem agenda). */
  next_due_date: IsoDate | null;
  due_today: boolean;
  taken_today: boolean;
  /** Rodízio: local diferente dos últimos usados (vias injetáveis). Sugere LOCAL, nunca dose. */
  suggested_site: InjectionSite | null;
}

/** GET /api/medications */
export interface MedicationsResponse {
  items: MedicationOverview[];
  recent_logs: MedicationLogRow[]; // últimos 30 dias, mais recentes primeiro
  side_effect_summary: { effect: SideEffect; count: number }[]; // 30 dias
  /** true se houve efeito com severidade 3 nos últimos 7 dias → UI orienta procurar o médico. */
  severe_recently: boolean;
  disclaimer: string;
}

// =========================================================================
// Progresso (0005)
// =========================================================================

export interface BodyMeasurementRow {
  id: Uuid;
  user_id: Uuid;
  logged_at: IsoDate;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  neck_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
  created_at: IsoTimestamp;
}

/** PUT /api/progress/measurements — upsert por dia. */
export type BodyMeasurementUpsert = Pick<BodyMeasurementRow, "logged_at"> &
  Partial<Omit<BodyMeasurementRow, "id" | "user_id" | "logged_at" | "created_at">>;

/** GET /api/progress?days=90 */
export interface ProgressResponse {
  range_days: number;
  weights: { date: IsoDate; weight_kg: number }[]; // crescente
  measurements: BodyMeasurementRow[]; // crescente
  weight_change_kg: number | null; // último − primeiro no intervalo
  waist_change_cm: number | null;
  /** Constância nos últimos 30 dias. */
  consistency: {
    meal_days: number; // dias com ≥ 1 refeição concluída
    water_goal_days: number; // dias que bateram a meta de água
    workouts: number; // treinos de programa registrados
    medication_doses: number; // aplicações registradas
  };
}

// =========================================================================
// Alimentos (0005)
// =========================================================================

export const FOOD_CATEGORIES = [
  "proteina",
  "carboidrato",
  "leguminosa",
  "fruta",
  "vegetal",
  "laticinio",
  "gordura",
  "bebida",
  "lanche",
  "preparacao",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface FoodRow {
  id: Uuid;
  name: string;
  category: FoodCategory;
  portion_label: string; // "1 filé médio (100 g)"
  portion_g: number;
  kcal: number; // por porção
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: string;
}

export interface MealLogItemRow {
  id: Uuid;
  meal_log_id: Uuid;
  food_id: Uuid | null;
  name: string;
  servings: number;
  kcal: number; // total para as porções
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: IsoTimestamp;
}

/**
 * POST /api/nutrition/meal-items — adiciona um alimento a uma refeição do
 * dia (cria a refeição se não existir e marca como concluída). Informe
 * `food_id` (catálogo) OU `custom` (valores próprios). `id` gerado no cliente.
 */
export type MealItemAdd = {
  id: Uuid;
  log_date: IsoDate;
  meal_slot: MealSlot;
  servings: number;
} & (
  | { food_id: Uuid; custom?: never }
  | { food_id?: never; custom: { name: string; kcal: number; protein_g?: number; carbs_g?: number; fat_g?: number } }
);

/** GET /api/foods?q=&category= e GET /api/foods/recent */
export interface FoodSearchResponse {
  items: FoodRow[];
}

// =========================================================================
// Treinos prontos (0005)
// =========================================================================

export const WORKOUT_GOALS = ["emagrecimento", "hipertrofia", "condicionamento", "corrida", "iniciante", "mobilidade"] as const;
export type WorkoutGoal = (typeof WORKOUT_GOALS)[number];
export const WORKOUT_LEVELS = ["iniciante", "intermediario", "avancado"] as const;
export type WorkoutLevel = (typeof WORKOUT_LEVELS)[number];
export const WORKOUT_LOCATIONS = ["academia", "casa", "ar_livre"] as const;
export type WorkoutLocation = (typeof WORKOUT_LOCATIONS)[number];
export const WORKOUT_KINDS = ["forca", "cardio", "corrida", "hiit", "mobilidade"] as const;
export type WorkoutKind = (typeof WORKOUT_KINDS)[number];

export interface WorkoutProgramRow {
  id: Uuid;
  slug: string;
  title: string;
  goal: WorkoutGoal;
  level: WorkoutLevel;
  location: WorkoutLocation;
  days_per_week: number;
  duration_weeks: number | null; // null = rotina que se repete
  session_minutes: number | null;
  summary: string;
  description: string | null;
  workout_count: number;
}

export interface ProgramExerciseRow {
  id: Uuid;
  order_index: number;
  name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  intensity: string | null;
  notes: string | null;
}

export interface ProgramWorkoutRow {
  id: Uuid;
  sequence: number;
  week: number | null;
  title: string;
  focus: string | null;
  kind: WorkoutKind;
  estimated_minutes: number | null;
  exercises: ProgramExerciseRow[];
}

/** GET /api/training/programs/:slug */
export interface ProgramDetail {
  program: WorkoutProgramRow;
  workouts: ProgramWorkoutRow[];
}

export interface ProgramWorkoutLogRow {
  id: Uuid;
  program_workout_id: Uuid;
  performed_on: IsoDate;
  duration_minutes: number | null;
  effort: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
  exercise_results: { exercise_id: Uuid; sets_done?: number; reps?: string; weight_kg?: number }[] | null;
  created_at: IsoTimestamp;
}

/** POST /api/training/logs */
export type ProgramWorkoutLogInsert = Pick<ProgramWorkoutLogRow, "id" | "program_workout_id" | "performed_on"> &
  Partial<Pick<ProgramWorkoutLogRow, "duration_minutes" | "effort" | "notes" | "exercise_results">>;

/** GET /api/training/today */
export interface TrainingToday {
  enrollment: { id: Uuid; started_on: IsoDate } | null;
  program: WorkoutProgramRow | null;
  /** Próximo treino da sequência (não do calendário). null = sem programa ou programa concluído. */
  next_workout: ProgramWorkoutRow | null;
  done_today: boolean;
  completed_count: number;
  /** Total de sessões em programas com progressão (ex.: corrida); null em rotinas. */
  total_sessions: number | null;
  program_completed: boolean;
  recent_logs: ProgramWorkoutLogRow[];
}

// =========================================================================
// Dicas / mentoria (0005)
// =========================================================================

export const TIP_CATEGORIES = ["alimentacao", "treino", "medicacao", "mentalidade", "comunidade", "app"] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];

export interface TipRow {
  id: Uuid;
  title: string;
  body: string;
  category: TipCategory;
  read_minutes: number;
  is_published: boolean;
  published_at: IsoTimestamp;
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
