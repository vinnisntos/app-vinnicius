-- 0006_seed_content.sql
-- Conteúdo inicial do produto: alimentos, programas de treino, FAQ, dicas
-- e tooltips dos módulos novos. Idempotente (on conflict do nothing) — o
-- master edita/expande depois pelo painel ou SQL.
--
-- Valores nutricionais: aproximações por porção caseira com base na Tabela
-- TACO (NEPA/UNICAMP, 4ª ed.). Servem para estimativa diária, não para
-- prescrição.

-- Chaves naturais para o seed ser idempotente (on conflict precisa de
-- constraint — sem ela, rodar de novo duplicaria FAQ e dicas).
create unique index if not exists faq_items_question_key on public.faq_items (question);
create unique index if not exists tips_title_key on public.tips (title);

-- =========================================================================
-- Alimentos
-- =========================================================================

insert into public.foods (name, category, portion_label, portion_g, kcal, protein_g, carbs_g, fat_g) values
  -- Carboidratos
  ('Arroz branco cozido', 'carboidrato', '4 colheres de sopa (100 g)', 100, 128, 2.5, 28.1, 0.2),
  ('Arroz integral cozido', 'carboidrato', '4 colheres de sopa (100 g)', 100, 124, 2.6, 25.8, 1.0),
  ('Macarrão cozido', 'carboidrato', '1 escumadeira (110 g)', 110, 150, 5.0, 31.0, 0.6),
  ('Pão francês', 'carboidrato', '1 unidade (50 g)', 50, 150, 4.0, 29.3, 1.6),
  ('Pão de forma integral', 'carboidrato', '2 fatias (50 g)', 50, 127, 4.7, 24.6, 1.9),
  ('Tapioca (goma)', 'carboidrato', '3 colheres de sopa (50 g)', 50, 120, 0.0, 29.5, 0.0),
  ('Cuscuz de milho cozido', 'carboidrato', '1 fatia média (100 g)', 100, 113, 2.2, 25.3, 0.7),
  ('Batata cozida', 'carboidrato', '1 unidade média (140 g)', 140, 73, 1.7, 16.7, 0.0),
  ('Batata-doce cozida', 'carboidrato', '1 unidade média (150 g)', 150, 116, 0.9, 27.6, 0.2),
  ('Mandioca cozida', 'carboidrato', '1 pedaço médio (100 g)', 100, 125, 0.6, 30.1, 0.3),
  ('Aveia em flocos', 'carboidrato', '2 colheres de sopa (30 g)', 30, 118, 4.2, 20.0, 2.6),
  ('Granola', 'carboidrato', '3 colheres de sopa (40 g)', 40, 170, 4.0, 26.0, 6.0),
  -- Leguminosas
  ('Feijão carioca cozido', 'leguminosa', '1 concha média (86 g)', 86, 65, 4.1, 11.7, 0.4),
  ('Feijão preto cozido', 'leguminosa', '1 concha média (86 g)', 86, 66, 3.9, 12.1, 0.5),
  ('Lentilha cozida', 'leguminosa', '1 concha média (90 g)', 90, 84, 5.7, 14.6, 0.5),
  ('Grão-de-bico cozido', 'leguminosa', '4 colheres de sopa (80 g)', 80, 131, 7.1, 21.9, 2.1),
  -- Proteínas
  ('Peito de frango grelhado', 'proteina', '1 filé médio (100 g)', 100, 159, 32.0, 0.0, 2.5),
  ('Coxa de frango assada sem pele', 'proteina', '1 unidade (90 g)', 90, 168, 25.0, 0.0, 7.0),
  ('Patinho moído refogado', 'proteina', '4 colheres de sopa (100 g)', 100, 219, 35.9, 0.0, 7.3),
  ('Alcatra grelhada', 'proteina', '1 bife médio (100 g)', 100, 241, 31.9, 0.0, 11.6),
  ('Carne de panela (acém)', 'proteina', '2 pedaços (100 g)', 100, 215, 27.3, 0.0, 10.9),
  ('Tilápia grelhada', 'proteina', '1 filé (100 g)', 100, 128, 26.2, 0.0, 2.7),
  ('Sardinha em lata (em óleo, escorrida)', 'proteina', '1/2 lata (60 g)', 60, 170, 15.9, 0.0, 11.9),
  ('Atum em lata (em água)', 'proteina', '1/2 lata (60 g)', 60, 70, 15.5, 0.0, 0.6),
  ('Ovo cozido', 'proteina', '1 unidade (50 g)', 50, 73, 6.7, 0.3, 4.8),
  ('Ovo mexido', 'proteina', '1 unidade (60 g)', 60, 100, 6.2, 0.4, 8.0),
  ('Omelete simples', 'proteina', '2 ovos (100 g)', 100, 154, 10.8, 0.5, 11.8),
  ('Peito de peru fatiado', 'proteina', '4 fatias (40 g)', 40, 40, 7.2, 1.2, 0.6),
  ('Whey protein', 'proteina', '1 scoop (30 g)', 30, 120, 24.0, 3.0, 1.5),
  -- Laticínios
  ('Leite integral', 'laticinio', '1 copo (200 ml)', 200, 124, 6.4, 9.4, 6.6),
  ('Leite desnatado', 'laticinio', '1 copo (200 ml)', 200, 70, 6.8, 9.8, 0.4),
  ('Iogurte natural integral', 'laticinio', '1 pote (170 g)', 170, 87, 7.0, 3.3, 5.1),
  ('Iogurte grego natural', 'laticinio', '1 pote (100 g)', 100, 110, 7.5, 5.0, 7.0),
  ('Queijo minas frescal', 'laticinio', '1 fatia média (30 g)', 30, 79, 5.2, 1.0, 6.1),
  ('Queijo muçarela', 'laticinio', '2 fatias (30 g)', 30, 99, 6.8, 0.9, 7.5),
  ('Requeijão light', 'laticinio', '1 colher de sopa (30 g)', 30, 55, 3.0, 1.0, 4.4),
  -- Frutas
  ('Banana prata', 'fruta', '1 unidade média (70 g)', 70, 69, 0.9, 18.2, 0.1),
  ('Maçã', 'fruta', '1 unidade média (130 g)', 130, 73, 0.4, 19.9, 0.0),
  ('Mamão papaia', 'fruta', '1/2 unidade (140 g)', 140, 56, 0.7, 14.6, 0.1),
  ('Laranja', 'fruta', '1 unidade média (180 g)', 180, 67, 1.8, 16.4, 0.2),
  ('Morango', 'fruta', '10 unidades (120 g)', 120, 36, 1.1, 8.2, 0.4),
  ('Melancia', 'fruta', '1 fatia média (200 g)', 200, 66, 1.8, 16.2, 0.0),
  ('Abacate', 'fruta', '2 colheres de sopa (60 g)', 60, 58, 0.7, 3.6, 5.0),
  ('Uva', 'fruta', '1 cacho pequeno (100 g)', 100, 53, 0.7, 13.6, 0.2),
  -- Vegetais
  ('Salada de folhas verdes', 'vegetal', '1 prato raso (60 g)', 60, 9, 0.8, 1.4, 0.1),
  ('Tomate', 'vegetal', '1 unidade média (100 g)', 100, 15, 1.1, 3.1, 0.2),
  ('Brócolis cozido', 'vegetal', '3 ramos (60 g)', 60, 15, 1.3, 2.6, 0.3),
  ('Cenoura crua ralada', 'vegetal', '3 colheres de sopa (40 g)', 40, 14, 0.5, 3.1, 0.1),
  ('Abobrinha refogada', 'vegetal', '3 colheres de sopa (80 g)', 80, 20, 1.0, 3.4, 0.4),
  ('Legumes cozidos variados', 'vegetal', '1 xícara (120 g)', 120, 45, 1.8, 9.0, 0.3),
  -- Gorduras
  ('Azeite de oliva', 'gordura', '1 colher de sopa (13 ml)', 13, 115, 0.0, 0.0, 13.0),
  ('Manteiga', 'gordura', '1 ponta de faca (10 g)', 10, 73, 0.0, 0.0, 8.3),
  ('Pasta de amendoim', 'gordura', '1 colher de sopa (15 g)', 15, 90, 3.8, 3.0, 7.5),
  ('Castanha-do-pará', 'gordura', '2 unidades (8 g)', 8, 52, 1.2, 1.2, 5.3),
  ('Amendoim torrado', 'gordura', '1 punhado (30 g)', 30, 174, 7.4, 5.5, 13.9),
  -- Bebidas
  ('Café sem açúcar', 'bebida', '1 xícara (50 ml)', 50, 2, 0.1, 0.3, 0.0),
  ('Café com açúcar', 'bebida', '1 xícara (50 ml)', 50, 33, 0.1, 8.3, 0.0),
  ('Suco de laranja natural', 'bebida', '1 copo (200 ml)', 200, 90, 1.4, 20.6, 0.2),
  ('Refrigerante comum', 'bebida', '1 lata (350 ml)', 350, 147, 0.0, 37.0, 0.0),
  ('Refrigerante zero', 'bebida', '1 lata (350 ml)', 350, 1, 0.0, 0.2, 0.0),
  ('Cerveja', 'bebida', '1 lata (350 ml)', 350, 147, 1.6, 12.0, 0.0),
  -- Lanches e preparações
  ('Pão de queijo', 'lanche', '2 unidades médias (50 g)', 50, 182, 2.6, 17.1, 12.3),
  ('Barra de cereal', 'lanche', '1 unidade (25 g)', 25, 95, 1.3, 18.5, 2.0),
  ('Biscoito de água e sal', 'lanche', '5 unidades (30 g)', 30, 129, 3.0, 20.6, 3.9),
  ('Chocolate ao leite', 'lanche', '1 quadradinho (25 g)', 25, 135, 1.8, 15.0, 7.5),
  ('Pizza de muçarela', 'preparacao', '1 fatia (100 g)', 100, 264, 11.0, 30.0, 11.0),
  ('Hambúrguer artesanal (pão + carne)', 'preparacao', '1 unidade (200 g)', 200, 520, 28.0, 40.0, 27.0),
  ('Prato feito (arroz, feijão, carne, salada)', 'preparacao', '1 prato (450 g)', 450, 650, 38.0, 75.0, 20.0),
  ('Sopa de legumes com carne', 'preparacao', '1 prato fundo (300 g)', 300, 180, 12.0, 20.0, 5.0),
  ('Vitamina de banana com leite', 'preparacao', '1 copo (300 ml)', 300, 230, 8.0, 38.0, 6.0)
on conflict (name, portion_label) do nothing;

-- =========================================================================
-- Programas de treino
-- =========================================================================

insert into public.workout_programs
  (slug, title, goal, level, location, days_per_week, duration_weeks, session_minutes, summary, description, order_index)
values
  ('emagrecer-em-casa', 'Emagrecer em casa', 'emagrecimento', 'iniciante', 'casa', 3, null, 30,
   'Circuitos sem equipamento, 3x por semana, para gastar energia e criar o hábito.',
   'Três circuitos (A, B, C) que se alternam. Faça as voltas no seu ritmo — conversar ofegante é o ponto certo. Se sentir tontura ou dor no peito, pare. Ideal para quem está começando ou usa medicação que reduz o apetite: priorize a constância, não a intensidade.', 10),
  ('full-body-iniciante', 'Academia do zero (full body)', 'iniciante', 'iniciante', 'academia', 3, null, 45,
   'Dois treinos de corpo inteiro alternados, 3x por semana. O melhor começo na academia.',
   'Alterne A e B (ex.: seg A, qua B, sex A). Use uma carga que permita completar as repetições com 2 de sobra. Quando ficar fácil nas 3 séries, aumente um pouco a carga. Treino de força preserva massa muscular durante o emagrecimento.', 20),
  ('hipertrofia-abc', 'Ganho de massa ABC', 'hipertrofia', 'intermediario', 'academia', 3, null, 60,
   'Divisão ABC clássica para ganho de massa muscular. Faça 3 ou 6 dias por semana.',
   'A: peito, ombro e tríceps · B: costas e bíceps · C: pernas e core. Para hipertrofia, a última repetição de cada série deve ser difícil. Coma proteína suficiente (veja a meta no app) — sem ela o músculo não cresce.', 30),
  ('queima-academia', 'Queima na academia (força + HIIT)', 'emagrecimento', 'intermediario', 'academia', 4, null, 50,
   'Força para manter músculo e intervalados curtos para gastar mais. 4x por semana.',
   'Dois treinos de força (superior e inferior) e dois de HIIT na esteira ou bike. Em déficit calórico, manter a força é o que garante que o peso perdido seja gordura, não músculo.', 40),
  ('corrida-5k', 'Do sofá aos 5 km', 'corrida', 'iniciante', 'ar_livre', 3, 8, 30,
   '8 semanas alternando caminhada e corrida até correr 5 km (ou 30 min) sem parar.',
   'Três sessões por semana com pelo menos um dia de descanso entre elas. Corra num ritmo em que ainda consiga falar frases curtas. Se uma semana ficou pesada, repita-a antes de avançar — isso é progresso, não fracasso.', 50),
  ('mobilidade-diaria', 'Mobilidade de 10 minutos', 'mobilidade', 'iniciante', 'casa', 7, null, 10,
   'Sequência curta diária para dores nas costas, postura e quem passa o dia sentado.',
   'Faça ao acordar ou antes de dormir. Movimentos lentos, sem dor. Ótimo complemento a qualquer outro programa.', 60)
on conflict (slug) do nothing;

-- Treinos e exercícios dos programas de rotina (fora a corrida).
do $$
declare
  p uuid;
  w uuid;
begin
  -- ---------------------------------------------------------------- casa
  select id into p from public.workout_programs where slug = 'emagrecer-em-casa';
  if not exists (select 1 from public.program_workouts where program_id = p) then
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 1, 'Circuito A', 'Corpo inteiro', 'hiit', 30) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds, notes) values
      (w, 1, 'Polichinelo', 4, '40 s', 20, 'Aquecimento dentro do circuito. 4 voltas completas.'),
      (w, 2, 'Agachamento livre', 4, '15', 20, 'Quadril para trás, joelhos alinhados com os pés.'),
      (w, 3, 'Flexão de braço (joelhos no chão se precisar)', 4, '10', 20, null),
      (w, 4, 'Afundo alternado', 4, '10 cada perna', 20, null),
      (w, 5, 'Prancha', 4, '30 s', 60, 'Descanse 60 s ao final de cada volta.');
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 2, 'Circuito B', 'Pernas e core', 'hiit', 30) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds, notes) values
      (w, 1, 'Corrida parada', 4, '40 s', 20, null),
      (w, 2, 'Ponte de glúteo', 4, '15', 20, null),
      (w, 3, 'Agachamento sumô', 4, '15', 20, null),
      (w, 4, 'Abdominal bicicleta', 4, '20', 20, null),
      (w, 5, 'Escalador (mountain climber)', 4, '30 s', 60, null);
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 3, 'Circuito C', 'Superiores e cardio', 'hiit', 30) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds, notes) values
      (w, 1, 'Polichinelo', 4, '40 s', 20, null),
      (w, 2, 'Tríceps no banco/cadeira', 4, '12', 20, 'Use uma cadeira firme encostada na parede.'),
      (w, 3, 'Remada com mochila', 4, '12', 20, 'Mochila com livros como carga.'),
      (w, 4, 'Agachamento com salto (ou sem salto)', 4, '10', 20, null),
      (w, 5, 'Prancha lateral', 4, '20 s cada lado', 60, null);
  end if;

  -- --------------------------------------------------------- full body
  select id into p from public.workout_programs where slug = 'full-body-iniciante';
  if not exists (select 1 from public.program_workouts where program_id = p) then
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 1, 'Treino A', 'Corpo inteiro', 'forca', 45) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds, notes) values
      (w, 1, 'Leg press 45°', 3, '12', 90, null),
      (w, 2, 'Supino reto com halteres', 3, '10', 90, null),
      (w, 3, 'Puxada frontal', 3, '12', 90, null),
      (w, 4, 'Cadeira flexora', 3, '12', 60, null),
      (w, 5, 'Elevação lateral', 3, '12', 60, null),
      (w, 6, 'Prancha', 3, '30 s', 45, null);
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 2, 'Treino B', 'Corpo inteiro', 'forca', 45) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds, notes) values
      (w, 1, 'Agachamento no smith', 3, '10', 90, null),
      (w, 2, 'Remada baixa', 3, '12', 90, null),
      (w, 3, 'Desenvolvimento com halteres', 3, '10', 90, null),
      (w, 4, 'Cadeira extensora', 3, '12', 60, null),
      (w, 5, 'Rosca direta', 3, '12', 60, null),
      (w, 6, 'Esteira inclinada', 1, '10 min', 0, 'Caminhada rápida com inclinação.');
  end if;

  -- -------------------------------------------------------------- ABC
  select id into p from public.workout_programs where slug = 'hipertrofia-abc';
  if not exists (select 1 from public.program_workouts where program_id = p) then
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 1, 'Treino A', 'Peito, ombro e tríceps', 'forca', 60) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds) values
      (w, 1, 'Supino reto com barra', 4, '8-10', 120),
      (w, 2, 'Supino inclinado com halteres', 3, '10-12', 90),
      (w, 3, 'Crucifixo na máquina', 3, '12', 60),
      (w, 4, 'Desenvolvimento militar', 3, '8-10', 90),
      (w, 5, 'Elevação lateral', 3, '12-15', 60),
      (w, 6, 'Tríceps na polia', 3, '12', 60),
      (w, 7, 'Tríceps francês', 3, '10-12', 60);
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 2, 'Treino B', 'Costas e bíceps', 'forca', 60) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds) values
      (w, 1, 'Barra fixa (ou puxada frontal)', 4, '6-10', 120),
      (w, 2, 'Remada curvada com barra', 4, '8-10', 90),
      (w, 3, 'Remada unilateral com halter', 3, '10-12', 60),
      (w, 4, 'Pulldown com braços estendidos', 3, '12', 60),
      (w, 5, 'Rosca direta com barra', 3, '8-10', 60),
      (w, 6, 'Rosca martelo', 3, '10-12', 60);
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 3, 'Treino C', 'Pernas e core', 'forca', 60) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds) values
      (w, 1, 'Agachamento livre', 4, '8-10', 150),
      (w, 2, 'Leg press 45°', 3, '10-12', 90),
      (w, 3, 'Stiff com halteres', 3, '10', 90),
      (w, 4, 'Cadeira extensora', 3, '12-15', 60),
      (w, 5, 'Panturrilha em pé', 4, '15', 45),
      (w, 6, 'Abdominal na polia', 3, '12-15', 45);
  end if;

  -- ---------------------------------------------------- queima academia
  select id into p from public.workout_programs where slug = 'queima-academia';
  if not exists (select 1 from public.program_workouts where program_id = p) then
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 1, 'Força superior', 'Peito, costas e ombros', 'forca', 50) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds) values
      (w, 1, 'Supino reto com halteres', 3, '10', 90),
      (w, 2, 'Puxada frontal', 3, '10', 90),
      (w, 3, 'Desenvolvimento com halteres', 3, '10', 90),
      (w, 4, 'Remada baixa', 3, '12', 60),
      (w, 5, 'Flexão de braço', 2, 'até a falha', 60);
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 2, 'HIIT na esteira ou bike', 'Condicionamento', 'hiit', 25) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds, duration_seconds, intensity, notes) values
      (w, 1, 'Aquecimento leve', 1, null, 0, 300, 'Leve', null),
      (w, 2, 'Tiro forte', 10, '30 s', 60, 30, 'Forte (RPE 8)', 'Recupere 60 s em ritmo leve entre os tiros.'),
      (w, 3, 'Desaquecimento', 1, null, 0, 300, 'Leve', null);
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 3, 'Força inferior', 'Pernas e glúteos', 'forca', 50) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, rest_seconds) values
      (w, 1, 'Agachamento no smith', 3, '10', 120),
      (w, 2, 'Levantamento terra romeno', 3, '10', 90),
      (w, 3, 'Afundo no banco (búlgaro)', 3, '10 cada perna', 90),
      (w, 4, 'Cadeira flexora', 3, '12', 60),
      (w, 5, 'Elevação pélvica', 3, '12', 60);
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 4, 'Cardio contínuo', 'Queima de gordura', 'cardio', 40) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, duration_seconds, intensity, notes) values
      (w, 1, 'Caminhada inclinada, bike ou elíptico', 1, 2400, 'Moderado (dá para conversar)', 'Mantenha um ritmo constante durante 40 minutos.');
  end if;

  -- -------------------------------------------------------- mobilidade
  select id into p from public.workout_programs where slug = 'mobilidade-diaria';
  if not exists (select 1 from public.program_workouts where program_id = p) then
    insert into public.program_workouts (program_id, sequence, title, focus, kind, estimated_minutes)
      values (p, 1, 'Mobilidade diária', 'Coluna, quadril e ombros', 'mobilidade', 10) returning id into w;
    insert into public.program_exercises (workout_id, order_index, name, sets, reps, duration_seconds, notes) values
      (w, 1, 'Gato-camelo', 1, '10 lentos', null, 'Arredonde e estenda a coluna devagar.'),
      (w, 2, 'Rotação torácica deitado', 1, '8 cada lado', null, null),
      (w, 3, 'Alongamento do flexor do quadril', 1, null, 60, '30 s cada lado.'),
      (w, 4, 'Círculos de ombro', 1, '10 cada sentido', null, null),
      (w, 5, 'Postura da criança', 1, null, 60, 'Respire fundo e solte o peso.');
  end if;
end $$;

-- Corrida 5K: progressão linear, 3 sessões iguais por semana, 8 semanas.
do $$
declare
  p uuid;
  w uuid;
  wk int;
  s int;
  seq int := 0;
  -- (corrida_s, caminhada_s, repetições) por semana; semana 8 = contínuo
  plan int[][] := array[
    [60, 90, 8],
    [90, 120, 6],
    [180, 90, 5],
    [300, 150, 4],
    [480, 120, 3],
    [600, 120, 2],
    [1200, 0, 1],
    [1800, 0, 1]
  ];
begin
  select id into p from public.workout_programs where slug = 'corrida-5k';
  if exists (select 1 from public.program_workouts where program_id = p) then
    return;
  end if;
  for wk in 1..8 loop
    for s in 1..3 loop
      seq := seq + 1;
      insert into public.program_workouts (program_id, sequence, week, title, focus, kind, estimated_minutes)
        values (p, seq, wk, format('Semana %s · Corrida %s', wk, s),
                case when plan[wk][2] = 0 then format('%s min correndo sem parar', plan[wk][1] / 60)
                     else format('%s× (%s corrida + %s caminhada)', plan[wk][3],
                                 case when plan[wk][1] < 60 then plan[wk][1] || ' s' else replace(trim(trailing '.' from trim(trailing '0' from round(plan[wk][1] / 60.0, 1)::text)), '.', ',') || ' min' end,
                                 case when plan[wk][2] < 60 then plan[wk][2] || ' s' else replace(trim(trailing '.' from trim(trailing '0' from round(plan[wk][2] / 60.0, 1)::text)), '.', ',') || ' min' end)
                end,
                'corrida',
                10 + (plan[wk][1] + plan[wk][2]) * plan[wk][3] / 60)
        returning id into w;
      insert into public.program_exercises (workout_id, order_index, name, sets, duration_seconds, intensity, notes) values
        (w, 1, 'Caminhada de aquecimento', 1, 300, 'Leve', null),
        (w, 2, 'Corrida', plan[wk][3], plan[wk][1], 'Ritmo de conversa', null),
        (w, 4, 'Caminhada de desaquecimento', 1, 300, 'Leve', null);
      if plan[wk][2] > 0 then
        insert into public.program_exercises (workout_id, order_index, name, sets, duration_seconds, intensity, notes) values
          (w, 3, 'Caminhada de recuperação (entre as corridas)', plan[wk][3], plan[wk][2], 'Leve',
           'Alterne: corrida → caminhada, repetindo o número de séries.');
      end if;
    end loop;
  end loop;
end $$;

-- =========================================================================
-- Dicas / mentoria
-- =========================================================================

insert into public.tips (title, body, category, read_minutes) values
  ('Constância vence intensidade',
   E'Registrar 3 refeições por dia durante 30 dias ensina mais sobre você do que uma semana perfeita seguida de abandono.\n\nUse os atalhos do app: um toque para água, um toque para marcar a refeição. Se o dia saiu do plano, registre mesmo assim — o dado honesto é o que te mostra o caminho.',
   'mentalidade', 2),
  ('Proteína primeiro',
   E'Em déficit calórico, e principalmente usando medicação que reduz o apetite, é comum comer pouca proteína e perder músculo junto com a gordura.\n\nComece cada refeição pela fonte de proteína (ovo, frango, peixe, carne, iogurte, leguminosas). A meta diária de proteína aparece no seu painel.',
   'alimentacao', 2),
  ('Água e medicação para emagrecer',
   E'Medicações que reduzem o apetite também podem reduzir a sede. Desidratação piora náusea, constipação e dor de cabeça.\n\nUse os lembretes de água do app e prefira goles ao longo do dia. Se tiver vômitos ou diarreia persistentes, procure seu médico.',
   'medicacao', 2),
  ('Rodízio do local de aplicação',
   E'Aplicar sempre no mesmo ponto pode causar endurecimento e irritação da pele. O app registra o local de cada aplicação para você alternar (abdômen, coxa, braço — lado esquerdo e direito).\n\nSiga sempre a orientação do seu médico e a bula do medicamento. O app não substitui acompanhamento médico.',
   'medicacao', 2),
  ('Músculo é seu aliado no emagrecimento',
   E'Treino de força 2–3 vezes por semana ajuda a manter a massa muscular enquanto você perde peso. Isso protege o metabolismo e melhora o formato do corpo.\n\nSe nunca treinou, comece pelo programa "Academia do zero" ou "Emagrecer em casa".',
   'treino', 2),
  ('A balança não conta tudo',
   E'O peso varia de 0,5 a 2 kg de um dia para o outro por água, sal e intestino. Pese-se sempre no mesmo horário e acompanhe a tendência semanal.\n\nRegistre também a cintura: às vezes a medida cai enquanto a balança empaca.',
   'mentalidade', 2),
  ('Poste a sua vitória, não a sua perfeição',
   E'A comunidade funciona com exemplos reais. Um prato simples e dentro do plano inspira mais do que uma foto perfeita.\n\nAo marcar uma refeição como feita, toque em "Compartilhar" — você decide se o post é público ou só seu.',
   'comunidade', 1),
  ('Como usar o app em 1 minuto por dia',
   E'1. Abra o app pelo ícone na tela inicial.\n2. Siga a "próxima ação" do painel — ele mostra o que fazer agora.\n3. Use os botões de baixo (água, refeição) — eles ficam ao alcance do polegar.\n4. Toque no "?" de qualquer tela quando tiver dúvida.',
   'app', 1)
on conflict (title) do nothing;

-- =========================================================================
-- FAQ
-- =========================================================================

insert into public.faq_items (question, answer, category, order_index) values
  -- Primeiros passos
  ('O que é este app?',
   E'Um hub de apoio para quem quer emagrecer com constância: você registra alimentação, água, peso, medidas, treinos e — se usar — medicação, e conta com uma comunidade de pessoas no mesmo caminho.\n\nO foco não é planilha: é o impulso coletivo de todo dia.',
   'Primeiros passos', 10),
  ('Como instalo o app no meu celular?',
   E'Android (Chrome): abra o site, toque no menu ⋮ e em "Instalar app" ou "Adicionar à tela inicial".\n\niPhone (Safari): toque no botão Compartilhar (quadrado com seta) e em "Adicionar à Tela de Início".\n\nDepois é só abrir pelo ícone, como qualquer aplicativo.',
   'Primeiros passos', 20),
  ('Por onde eu começo?',
   E'1. Em Alimentação, preencha o seu perfil (altura, peso, objetivo) — leva 2 minutos e libera suas metas.\n2. Se usa medicação, cadastre em Medicação.\n3. Escolha um programa em Treinos.\n4. A partir daí, siga a "próxima ação" do painel inicial.',
   'Primeiros passos', 30),
  -- Assinatura
  ('Como funciona o período grátis?',
   E'Você tem 3 dias grátis com acesso completo a partir do cadastro. Nesse período aparecem lembretes de que o teste vai acabar. Você pode assinar a qualquer momento — não precisa esperar o fim do teste.',
   'Assinatura', 10),
  ('Quais formas de pagamento são aceitas?',
   E'Pix, boleto e cartão de crédito, pelo Asaas (processador de pagamentos). Na primeira assinatura pedimos seu CPF, que vai direto para o processador e não fica salvo no app.\n\nO acesso é liberado automaticamente assim que o pagamento é confirmado. No Pix costuma ser imediato; no boleto pode levar até 3 dias úteis.',
   'Assinatura', 20),
  ('Paguei e o acesso não liberou. E agora?',
   E'Pix e cartão liberam em poucos minutos; boleto pode levar até 3 dias úteis. Feche e abra o app para atualizar. Se passar desse prazo, fale com o suporte pelo WhatsApp com o comprovante.',
   'Assinatura', 30),
  ('Como cancelo a assinatura?',
   E'Fale com o suporte pelo WhatsApp e cancelamos para você. Seu acesso continua até o fim do período já pago.',
   'Assinatura', 40),
  -- Alimentação
  ('Como o app calcula minhas calorias?',
   E'Usamos a fórmula Mifflin-St Jeor com seu peso mais recente, altura, idade e sexo para estimar o metabolismo basal (BMR). Multiplicamos pelo seu nível de atividade para chegar ao gasto diário (TDEE).\n\nPara emagrecer, a meta é o TDEE menos 20%, nunca abaixo de 1200 kcal (mulheres) ou 1500 kcal (homens). Toda vez que você registra um peso novo, a meta se ajusta.',
   'Alimentação', 10),
  ('E as metas de proteína, carboidrato e gordura?',
   E'Proteína: 1,8 g por kg de peso para emagrecer ou ganhar massa (1,6 g/kg para manter) — protege seus músculos. Gordura: 25% das calorias. Carboidrato: o restante.\n\nSão referências gerais. Se você tem acompanhamento com nutricionista, siga o plano dele.',
   'Alimentação', 20),
  ('Preciso saber as calorias de tudo que como?',
   E'Não. Escolha o alimento na lista e ajuste a porção — o app soma as calorias e os macros. Se não achar o alimento, use os atalhos de calorias (+100, +200…) com uma estimativa. Registrar aproximado todos os dias vale mais do que registrar exato de vez em quando.',
   'Alimentação', 30),
  ('Funciona sem internet?',
   E'Sim para refeições: se a internet cair, o app guarda o registro no celular e envia sozinho quando a conexão voltar. Os dados ficam separados por conta, mesmo em celular compartilhado.',
   'Alimentação', 40),
  -- Medicação
  ('O app me diz qual dose tomar?',
   E'Não, e nunca vai dizer. O app só registra a dose que o SEU MÉDICO prescreveu, para você acompanhar aplicações, local e efeitos. Nunca altere a dose por conta própria.',
   'Medicação', 10),
  ('Para que serve registrar os efeitos colaterais?',
   E'Para você e seu médico enxergarem padrões: por exemplo, se a náusea aparece sempre no dia seguinte à aplicação ou melhora com o tempo. Leve o histórico para a consulta.\n\nEfeitos fortes (vômitos persistentes, dor abdominal intensa, sinais de desidratação) são motivo para procurar atendimento médico — não espere pelo app.',
   'Medicação', 20),
  ('Minhas informações de medicação aparecem na comunidade?',
   E'Não. Medicação é privada. Só aparece na comunidade o que você mesmo decidir publicar.',
   'Medicação', 30),
  -- Treinos
  ('Qual programa de treino devo escolher?',
   E'Nunca treinou: "Emagrecer em casa" ou "Academia do zero".\nQuer ganhar massa e já treina: "Ganho de massa ABC".\nQuer correr: "Do sofá aos 5 km".\nQuer só se mexer melhor: "Mobilidade de 10 minutos".\n\nVocê pode trocar de programa quando quiser.',
   'Treinos', 10),
  ('Perdi dias de treino. E agora?',
   E'Nada se perde: o app mostra o próximo treino da sequência, não o dia do calendário. Continue de onde parou.',
   'Treinos', 20),
  -- Comunidade
  ('Quem vê o que eu publico?',
   E'Posts públicos aparecem para todos os assinantes. Posts "Só eu" ficam só no seu histórico. Seu e-mail e celular nunca aparecem — só seu nome.',
   'Comunidade', 10),
  ('Vi um post ofensivo. O que faço?',
   E'Avise o suporte pelo WhatsApp. A moderação pode ocultar posts que desrespeitem as regras.',
   'Comunidade', 20),
  -- Lembretes
  ('Como recebo lembretes no celular?',
   E'Em Lembretes, conecte sua conta Google. O app cria eventos recorrentes na sua agenda (treino, água, refeições, pesagem, medicação) e o próprio Google Agenda te notifica no celular — sem instalar nada.',
   'Lembretes', 10),
  ('Desconectei o Google. Os eventos somem?',
   E'Sim: ao desconectar, apagamos os eventos que criamos e revogamos o acesso à sua agenda. Seus lembretes continuam salvos no app para quando quiser reconectar.',
   'Lembretes', 20),
  -- Conta e privacidade
  ('Esqueci minha senha.',
   E'Na tela de login toque em "Esqueci minha senha" e informe seu e-mail. Você recebe um link para criar uma senha nova.',
   'Conta e privacidade', 10),
  ('Meus dados estão seguros?',
   E'Cada conta só enxerga os próprios dados — isso é garantido no banco de dados, não só na tela. Tokens de integração ficam criptografados. Nunca vendemos nem compartilhamos seus dados.',
   'Conta e privacidade', 20),
  ('Como excluo minha conta e meus dados?',
   E'Fale com o suporte pelo WhatsApp e excluímos sua conta e todos os seus registros.',
   'Conta e privacidade', 30)
on conflict (question) do nothing;

-- =========================================================================
-- Tooltips dos módulos novos
-- =========================================================================

insert into public.help_tooltips (key, title, body) values
  ('route.medicacao', 'Medicação',
   'Registre a medicação prescrita pelo seu médico, cada aplicação e como você se sentiu. O app não sugere nem altera doses.'),
  ('medications.dose_amount', 'Dose prescrita',
   'Informe exatamente a dose que seu médico prescreveu. Mudou a dose? Atualize aqui só depois da orientação médica.'),
  ('medication_logs.injection_site', 'Local da aplicação',
   'Alterne os locais a cada aplicação para evitar irritação. O app mostra onde foi a última para você escolher outro.'),
  ('medication_logs.side_effects', 'Como você se sentiu',
   'Marque o que sentiu depois da aplicação. Efeitos fortes ou persistentes: procure seu médico.'),
  ('route.progresso', 'Sua evolução',
   'Peso, medidas e constância ao longo do tempo. Olhe a tendência das semanas, não o número de um dia.'),
  ('body_measurements.waist_cm', 'Cintura',
   'Meça na altura do umbigo, sem apertar a fita, de manhã e sempre do mesmo jeito.'),
  ('meal_log_items.servings', 'Porção',
   'Ajuste quantas porções você comeu. Ex.: 1,5 = uma porção e meia da medida mostrada.'),
  ('metric.macros', 'Macros',
   'Proteína, carboidrato e gordura do dia. A proteína é a mais importante para preservar músculo enquanto emagrece.'),
  ('route.treinos', 'Treinos',
   'Escolha um programa pronto e siga o próximo treino da sequência. Faltou um dia? Continue de onde parou.'),
  ('workout_programs.goal', 'Objetivo do programa',
   'Emagrecimento e condicionamento gastam mais energia; hipertrofia foca em ganhar músculo; mobilidade melhora postura e dores.'),
  ('program_workout_logs.effort', 'Esforço',
   'De 1 (muito leve) a 5 (máximo). Ajuda a ajustar a carga: se tudo está em 1–2, está na hora de progredir.'),
  ('route.dicas', 'Dicas',
   'Conteúdo curto e prático, escolhido pela mentoria, para você aplicar hoje.')
on conflict (key) do nothing;
