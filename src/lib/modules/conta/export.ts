import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  bodyMeasurements,
  calendarReminders,
  mealLogItems,
  mealLogs,
  medicationLogs,
  medications,
  nutritionProfile,
  postReactions,
  posts,
  profiles,
  programEnrollments,
  programWorkoutLogs,
  subscriptions,
  waterLogs,
  weightLogs,
} from "@/lib/db/schema";

/**
 * Exportação dos dados pelo próprio titular (LGPD — portabilidade/acesso).
 * Devolve tudo que o usuário registrou, em JSON. Ficam DE FORA: identificadores
 * e tokens de integrações (Asaas, Google) e anotações internas do master.
 */
export async function exportUserData(userId: string) {
  const [
    [profile],
    [nutrition],
    [subscription],
    weights,
    measurements,
    meals,
    mealItems,
    water,
    meds,
    medLogs,
    enrollments,
    workoutLogs,
    userPosts,
    reactions,
    reminders,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
    db.select().from(nutritionProfile).where(eq(nutritionProfile.userId, userId)).limit(1),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1),
    db.select().from(weightLogs).where(eq(weightLogs.userId, userId)).orderBy(desc(weightLogs.loggedAt)),
    db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, userId)).orderBy(desc(bodyMeasurements.loggedAt)),
    db.select().from(mealLogs).where(eq(mealLogs.userId, userId)).orderBy(desc(mealLogs.logDate)),
    db.select().from(mealLogItems).where(eq(mealLogItems.userId, userId)),
    db.select().from(waterLogs).where(eq(waterLogs.userId, userId)).orderBy(desc(waterLogs.logDate)),
    db.select().from(medications).where(eq(medications.userId, userId)),
    db.select().from(medicationLogs).where(eq(medicationLogs.userId, userId)).orderBy(desc(medicationLogs.logDate)),
    db.select().from(programEnrollments).where(eq(programEnrollments.userId, userId)),
    db.select().from(programWorkoutLogs).where(eq(programWorkoutLogs.userId, userId)).orderBy(desc(programWorkoutLogs.performedOn)),
    db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt)),
    db.select().from(postReactions).where(eq(postReactions.userId, userId)),
    db.select().from(calendarReminders).where(eq(calendarReminders.userId, userId)),
  ]);

  return {
    exportado_em: new Date().toISOString(),
    conta: profile && {
      nome: profile.fullName,
      email: profile.email,
      celular: profile.phone,
      fuso_horario: profile.timezone,
      usa_medicacao: profile.medicationStatus,
      consentimento_dados_saude_em: profile.healthConsentAt,
      versao_do_consentimento: profile.healthConsentVersion,
      criada_em: profile.createdAt,
    },
    assinatura: subscription && {
      situacao: subscription.status,
      plano: subscription.plan,
      teste_ate: subscription.trialEndsAt,
      periodo_pago_ate: subscription.currentPeriodEnd,
      cancelamento_pedido_em: subscription.cancelRequestedAt,
    },
    perfil_nutricional: nutrition ?? null,
    pesagens: weights,
    medidas: measurements,
    refeicoes: meals,
    itens_das_refeicoes: mealItems,
    agua: water,
    medicacoes: meds,
    aplicacoes: medLogs,
    programas_de_treino: enrollments,
    treinos_registrados: workoutLogs,
    publicacoes: userPosts,
    reacoes: reactions,
    lembretes: reminders.map((reminder) => ({ ...reminder, googleEventId: undefined })),
  };
}
