-- ---------------------------------------------------------------------------
-- QUEM ESCREVE NO LEDGER — a lista fechada, conferida no banco.
-- ---------------------------------------------------------------------------
--
-- O invariante (decisão do dono, 03/10/2026):
--
--   «Todo débito entra no ledger por função do banco que lê o preço do
--    catálogo, append-only, com a carteira travada.»
--
-- Uma frase num arquivo não é uma trava. Este script LÊ o catálogo do Postgres
-- (`pg_proc`) e recusa — com exceção — se:
--
--   1. alguma função de `public` grava em `ledger_transactions` e NÃO está na
--      lista fechada abaixo;
--   2. alguma função da lista deixou de: ser `security definer`, travar a
--      carteira (`for update`), ler o preço de uma tabela do catálogo
--      (`public.ai_model…`), ou passou a RECEBER preço como argumento;
--   3. o ledger ganhou política de escrita para o usuário, perdeu o RLS, ou
--      perdeu um dos gatilhos que o fazem append-only e projetam a carteira;
--   4. alguma função `security definer` de `public` usa `EXECUTE` (SQL
--      dinâmico) — acusada para REVISÃO MANUAL, porque as checagens 1 e 2 leem
--      o texto da função e um `INSERT` montado em tempo de execução escapa.
--
-- O LIMITE QUE SOBRA É SÓ ESSE: uma função acusada pela 4 precisa ser lida por
-- gente. Se ela for legítima, a saída é reescrevê-la sem `EXECUTE` — nunca
-- uma lista de exceções aqui.
--
-- SÓ LÊ. Não grava nada, não chama função nenhuma, não precisa de `BEGIN`.
-- Roda no SQL Editor (ou pelo MCP, que é só leitura). O "erro" do fim É o
-- relatório — a doutrina de 07/08/2026 —, e a última linha diz o veredito:
--
--     TOTAL n · OK n · FALHA 0
--
-- QUANDO UMA FUNÇÃO NOVA PRECISAR COBRAR: ela entra na lista AQUI, no mesmo
-- commit da migration que a cria, e o invariante do CLAUDE.md e do
-- docs/decisoes.md ganha o nome dela. Fora disso, este script fica vermelho —
-- e é para ficar.
--
-- A lista tem uma função que só existe depois da migration da F1
-- (`record_product_reading`). Antes dela, o script a relata como "ainda não
-- existe" — o que não é falha: a lista diz quem PODE, não quem tem de existir.
-- ---------------------------------------------------------------------------

do $$
declare
  -- A LISTA FECHADA. Quatro funções, e nenhuma outra.
  c_permitidas constant text[] := array[
    'record_generation',          -- imagem, texto (Roteiro): grava e cobra
    'record_extraction',          -- extração de personagem
    'record_product_reading',     -- leitura de produto (Frente 1, F1)
    'complete_video_generation'   -- vídeo: cobra quando o provedor entrega
  ];
  -- O que faz o ledger ser append-only e a carteira ser projeção dele.
  c_gatilhos constant text[] := array[
    'ledger_transactions_reject_update',
    'ledger_transactions_reject_delete',
    'ledger_transactions_apply_to_wallet'
  ];
  r record;
  v_rel text := '';
  v_total integer := 0;
  v_falhas integer := 0;
  v_nome text;
  v_ok boolean;
  v_n integer;
begin
  -- 1. Toda função de `public` que grava no ledger está na lista.
  for r in
    select p.proname as nome,
           p.prosecdef as definer,
           (p.prosrc ~* 'for[[:space:]]+update') as trava,
           (p.prosrc ~* 'from[[:space:]]+public[.]ai_model') as le_catalogo,
           (pg_get_function_identity_arguments(p.oid) ~* '(price|preco|sparks|amount|charged)') as recebe_preco
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosrc ~* 'insert[[:space:]]+into[[:space:]]+(public[.])?ledger_transactions'
     order by p.proname
  loop
    v_total := v_total + 1;
    v_ok := r.nome = any (c_permitidas);
    if not v_ok then v_falhas := v_falhas + 1; end if;
    v_rel := v_rel || format(E'%s  %s grava no ledger — %s\n',
      case when v_ok then 'OK    ' else 'FALHA ' end, r.nome,
      case when v_ok then 'esta na lista' else 'NAO ESTA NA LISTA FECHADA' end);

    if v_ok then
      -- 2. E cobra do jeito do invariante.
      v_total := v_total + 1;
      v_ok := r.definer and r.trava and r.le_catalogo and not r.recebe_preco;
      if not v_ok then v_falhas := v_falhas + 1; end if;
      v_rel := v_rel || format(E'%s  %s: security definer=%s · trava a carteira=%s · le o preco do catalogo=%s · recebe preco por argumento=%s\n',
        case when v_ok then 'OK    ' else 'FALHA ' end, r.nome, r.definer, r.trava, r.le_catalogo, r.recebe_preco);
    end if;
  end loop;

  -- As da lista que ainda não existem: dito, não acusado.
  foreach v_nome in array c_permitidas loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = v_nome
    ) then
      v_rel := v_rel || format(E'--      %s: esta na lista e ainda nao existe neste banco\n', v_nome);
    end if;
  end loop;

  -- 1b. SQL dinâmico. A checagem 1 lê o TEXTO das funções: um `EXECUTE` que
  --     montasse o `INSERT` com o nome da tabela concatenado passaria por ela.
  --     Então toda função `security definer` de `public` que usa `EXECUTE` é
  --     acusada, para REVISÃO MANUAL — uma linha de FALHA por função. Nenhuma:
  --     dito, e não entra na conta.
  v_n := 0;
  for r in
    select p.proname as nome
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and p.prosrc ~* '[[:<:]]execute[[:>:]]'
     order by p.proname
  loop
    v_n := v_n + 1;
    v_total := v_total + 1;
    v_falhas := v_falhas + 1;
    v_rel := v_rel || format(E'FALHA   %s e SECURITY DEFINER e usa EXECUTE — REVISAO MANUAL: SQL dinamico pode gravar no ledger sem este script ver\n', r.nome);
  end loop;
  if v_n = 0 then
    v_rel := v_rel || E'--      nenhuma funcao SECURITY DEFINER de public usa EXECUTE (SQL dinamico)\n';
  end if;

  -- 3a. O usuário não escreve no ledger: RLS ligado, e só política de leitura.
  v_total := v_total + 1;
  select count(*) into v_n from pg_policies
   where schemaname = 'public' and tablename = 'ledger_transactions' and cmd <> 'SELECT';
  v_ok := v_n = 0 and (select relrowsecurity from pg_class where oid = 'public.ledger_transactions'::regclass);
  if not v_ok then v_falhas := v_falhas + 1; end if;
  v_rel := v_rel || format(E'%s  ledger_transactions: RLS ligado, e %s politica(s) de escrita para o usuario\n',
    case when v_ok then 'OK    ' else 'FALHA ' end, v_n);

  -- 3b. Append-only e projeção: os três gatilhos estão de pé.
  foreach v_nome in array c_gatilhos loop
    v_total := v_total + 1;
    v_ok := exists (
      select 1 from pg_trigger
       where tgrelid = 'public.ledger_transactions'::regclass and tgname = v_nome and tgenabled <> 'D' and not tgisinternal
    );
    if not v_ok then v_falhas := v_falhas + 1; end if;
    v_rel := v_rel || format(E'%s  gatilho %s\n', case when v_ok then 'OK    ' else 'FALHA ' end, v_nome);
  end loop;

  raise exception E'\n\n=====================================================================\n QUEM ESCREVE NO LEDGER — a lista fechada\n Este "erro" E o relatorio. Nada foi gravado: o script so le.\n=====================================================================\n\n%\n---------------------------------------------------------------------\n TOTAL %  ·  OK %  ·  FALHA %\n=====================================================================\n',
    v_rel, v_total, v_total - v_falhas, v_falhas;
end;
$$;
