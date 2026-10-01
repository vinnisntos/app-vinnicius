import type { Metadata } from "next";
import Link from "next/link";
import { APP_CONFIG } from "@/lib/app-config";
import { getAppSettings } from "@/lib/modules/conta/repository";
import { toPublicSettings } from "@/lib/api/mappers";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Como o ${APP_CONFIG.name} trata seus dados pessoais e dados sensíveis de saúde.`,
  robots: { index: true, follow: true },
  alternates: { canonical: `${APP_CONFIG.url}/privacidade` },
};

export default async function PrivacyPage() {
  const settings = await getAppSettings().catch(() => null);
  const support = settings ? toPublicSettings(settings).support_whatsapp_url : null;
  return <main className="legal-page">
    <p className="legal-warning">Texto-modelo — revise com um profissional antes de publicar.</p>
    <h1>Política de privacidade</h1><p>Última atualização: 01/10/2026.</p><p>O {APP_CONFIG.name} é o controlador dos dados pessoais tratados no serviço. Esta política explica quais dados usamos e como você exerce seus direitos previstos na Lei Geral de Proteção de Dados (LGPD).</p>
    <h2>1. Dados coletados</h2><p>Tratamos dados de conta e contato, informações de assinatura, registros de alimentação, água, treinos, progresso corporal e comunidade. Se você optar por usar o módulo de saúde, tratamos dados sensíveis, como medicação prescrita, aplicações e efeitos relatados. A conexão com o Google Agenda é opcional e usa os dados necessários para criar e atualizar lembretes. No cadastro, registramos também a origem da visita (por exemplo, a campanha pela qual você chegou).</p>
    <h2>2. Finalidades e bases legais</h2><p>Usamos seus dados para criar a conta, prestar as funcionalidades solicitadas, administrar pagamentos, proteger o serviço e atender solicitações. O tratamento dos dados sensíveis de saúde ocorre com seu consentimento específico e destacado, para as finalidades do módulo de saúde. Você pode revogar esse consentimento, observadas as consequências para essas funcionalidades. Outras bases legais podem se aplicar a obrigações legais, segurança e execução do contrato, conforme o caso.</p>
    <h2>3. Compartilhamento e processadores</h2><p>Utilizamos Supabase para autenticação e armazenamento, Asaas para processar a assinatura e Google para a integração opcional com a Agenda. Esses prestadores recebem apenas os dados necessários a cada finalidade e operam segundo seus próprios termos e medidas de segurança. Dados de saúde não são publicados na comunidade, a menos que você decida compartilhá-los.</p>
    <h2>4. Armazenamento e segurança</h2><p>Aplicamos controles de acesso por conta e medidas técnicas para limitar o acesso indevido. Guardamos os dados durante a relação contratual e pelo prazo necessário para obrigações legais, defesa de direitos e segurança; depois, eliminamos ou anonimizamos quando cabível.</p>
    <h2>5. Seus direitos</h2><p>Você pode solicitar confirmação do tratamento, acesso, correção, portabilidade, informação sobre compartilhamento, revogação do consentimento e exclusão de dados, respeitadas as hipóteses legais de retenção. Para fazer uma solicitação, inclusive exclusão da conta, {support ? <a href={support} target="_blank" rel="noopener noreferrer">fale pelo WhatsApp de suporte</a> : <>acesse a <Link href="/faq">página de ajuda</Link> para encontrar o canal de suporte</>}.</p>
    <h2>6. Dados de saúde</h2><p>São dados de saúde o seu peso e medidas, os registros de alimentação e água, a informação de que você usa medicação prescrita, as aplicações que registra e os efeitos que relata. Tratamos esses dados somente com o consentimento específico que você dá ao criar a conta, e apenas para o funcionamento do app: mostrar seus registros, suas metas e sua evolução. Não enviamos dados de saúde para ferramentas de análise ou publicidade de terceiros. A medição de uso do serviço é interna e registra apenas que uma ação aconteceu (por exemplo, “registrou uma refeição”), nunca o conteúdo do registro. Você pode baixar todos os seus dados em Minha conta → Baixar meus dados e apagar tudo em Minha conta → Excluir conta. Excluir a conta é também a forma de revogar o consentimento, já que o app não funciona sem esses dados.</p>
    <h2>7. Mudanças desta política</h2><p>Atualizações relevantes serão comunicadas por meio adequado. A versão vigente ficará disponível nesta página.</p>
    <p className="legal-back"><Link href="/site">Voltar ao início</Link> · <Link href="/termos">Termos de uso</Link></p>
  </main>;
}
