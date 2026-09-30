import type { Metadata } from "next";
import Link from "next/link";
import { APP_CONFIG } from "@/lib/app-config";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Termos de uso do ${APP_CONFIG.name}.`,
  robots: { index: true, follow: true },
  alternates: { canonical: `${APP_CONFIG.url}/termos` },
};

export default function TermsPage() {
  return <main className="legal-page">
    <p className="legal-warning">Texto-modelo — revise com um profissional antes de publicar.</p>
    <h1>Termos de uso</h1><p>Este documento descreve as condições de uso do {APP_CONFIG.name}. Ao criar uma conta, você deve ler e aceitar estes termos e a <Link href="/privacidade">Política de Privacidade</Link>.</p>
    <h2>1. O serviço</h2><p>O {APP_CONFIG.name} oferece ferramentas para registrar alimentação, água, treinos, progresso, lembretes e informações sobre medicação prescrita, além de participação na comunidade. As informações e dicas do app têm caráter educativo e de organização pessoal.</p>
    <h2>2. Saúde e responsabilidade</h2><p>Este app não substitui acompanhamento médico. Siga a prescrição do seu médico. O serviço não diagnostica, prescreve nem recomenda doses. Em caso de sintomas graves, procure atendimento médico. Você é responsável pelos dados que registra e por buscar orientação de profissionais de saúde para decisões clínicas e nutricionais.</p>
    <h2>3. Conta e comunidade</h2><p>Você deve informar dados corretos, proteger seu acesso e respeitar outras pessoas. Não publique dados de saúde de terceiros, conteúdo ofensivo ou ilegal. Podemos ocultar publicações que violem estas regras, preservados os direitos aplicáveis.</p>
    <h2>4. Teste e assinatura</h2><p>O acesso inicial tem 3 dias grátis. Após esse período, o plano custa R$ 19,90 por mês, sujeito à confirmação no checkout. Aceitamos Pix, boleto e cartão por meio do Asaas. Você pode cancelar quando quiser; a vigência e eventuais reembolsos seguem as condições mostradas na contratação e a legislação de consumo.</p>
    <h2>5. Disponibilidade e alterações</h2><p>Buscamos manter o serviço disponível e seguro, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros. Alterações relevantes destes termos serão comunicadas por meios adequados antes de entrar em vigor.</p>
    <h2>6. Dados pessoais e contato</h2><p>O tratamento dos dados, inclusive dados sensíveis de saúde, está detalhado na <Link href="/privacidade">Política de Privacidade</Link>. Para dúvidas, exercício de direitos ou exclusão da conta, use o WhatsApp de suporte indicado no site e na página de ajuda.</p>
    <p className="legal-back"><Link href="/site">Voltar ao início</Link></p>
  </main>;
}
