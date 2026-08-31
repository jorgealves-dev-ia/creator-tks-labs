-- =============================================================================
-- ESTORNO · incidente do laço de reanimação — 29/08/2026
--
-- Autorizado pelo Jorge em 29/08/2026. Rodar no SQL Editor do Supabase.
--
-- ⚠️  RODE ANTES DE QUALQUER NOVA GERAÇÃO. A trava confere o saldo em valor
--     absoluto (4.780 ⚡). Qualquer transação entre agora e a execução faz ela
--     abortar — de propósito: um estorno cego sobre um saldo que mudou é
--     exatamente o tipo de correção que cria o próximo incidente.
--
-- -----------------------------------------------------------------------------
-- O que aconteceu
-- -----------------------------------------------------------------------------
--
-- Um clique em «Reanimar 1 cena · por 210 ⚡» produziu 626 submissões de vídeo
-- em três minutos, todas da mesma cena. Vinte delas fecharam e cobraram:
-- 20 × 210 = 4.200 ⚡, saldo 4.990 → 790.
--
-- O clique pedia UM clipe. Dezenove foram pagas por defeito nosso — o laço
-- descrito no post-mortem em `docs/decisoes.md`.
--
-- -----------------------------------------------------------------------------
-- Por que 19 lançamentos, e não um de 3.990
-- -----------------------------------------------------------------------------
--
-- `generation_id` é a coluna que liga um estorno ao débito que ele corrige. Um
-- lançamento agregado nasceria com esse campo nulo, e a auditoria de daqui a um
-- ano não conseguiria dizer QUAIS dezenove das vinte foram estornadas.
--
-- O ledger é append-only por trigger (`reject_update` / `reject_delete`): a
-- correção é sempre lançamento novo, nunca UPDATE. A carteira é projeção — o
-- trigger `apply_ledger_transaction` a atualiza sozinho a cada INSERT.
--
-- -----------------------------------------------------------------------------
-- A trava é uma EXCEÇÃO, não uma leitura humana
-- -----------------------------------------------------------------------------
--
-- A primeira versão deste arquivo pedia "leia os números antes de dar COMMIT".
-- **O instrumento não permite isso**: o SQL Editor do Supabase mostra apenas o
-- resultado da ÚLTIMA instrução do script, e a última era o COMMIT — a
-- conferência nunca aparecia na tela, e o ROLLBACK manual que ela deveria
-- disparar não tinha quem o executasse.
--
-- Então a conferência virou um bloco `DO` que **levanta exceção** quando algum
-- número diverge. A exceção desfaz a transação inteira sozinha, sem depender de
-- ninguém ler nada no meio. Os SELECTs no fim são para VER o que foi gravado,
-- depois de gravado — nunca para decidir.
--
-- -----------------------------------------------------------------------------
-- As 19 são DERIVADAS, não coladas — e rodar duas vezes é seguro
-- -----------------------------------------------------------------------------
--
-- O INSERT seleciona as gerações do próprio banco em vez de listar 19 UUIDs à
-- mão: dezenove identificadores transcritos são dezenove chances de um
-- caractere trocado estornar a geração errada.
--
-- Na SEGUNDA execução o INSERT insere 0 linhas (o `NOT EXISTS` já as vê
-- estornadas) e a trava passa igual, porque ela confere o **estado final**
-- (19 / 4780 / 4780) e não o quanto mudou nesta rodada.
-- =============================================================================

BEGIN;

INSERT INTO ledger_transactions (user_id, kind, amount_cents, generation_id, description)
SELECT
  g.user_id,
  'refund'::ledger_kind,
  210,
  g.id,
  'Estorno · incidente do laço de reanimação, 29/08/2026 · vídeo da cena 1 cobrado 20× por defeito nosso'
FROM generations g
WHERE g.media_kind = 'video'
  AND g.status = 'succeeded'
  AND g.created_at >= '2026-08-29 14:00:00+00'
  AND g.created_at <  '2026-08-29 15:00:00+00'
  -- Nunca estornar linha que não foi cobrada: o valor devolvido é o valor
  -- cobrado, e uma geração com `sparks_charged` diferente de 210 não pertence
  -- a este incidente, por mais que caia na janela de tempo.
  AND g.sparks_charged = 210
  -- a devida fica de fora do estorno
  AND g.id <> '445067da-0fd8-4d11-925e-ae0bd1aabfcc'
  -- idempotência: nunca estorna a mesma geração duas vezes
  AND NOT EXISTS (
    SELECT 1 FROM ledger_transactions r
    WHERE r.generation_id = g.id AND r.kind = 'refund'
  );

-- -----------------------------------------------------------------------------
-- A TRAVA. Se qualquer número divergir, a exceção desfaz tudo — sem COMMIT,
-- sem ROLLBACK manual, sem ninguém precisar ler nada.
-- -----------------------------------------------------------------------------
DO $trava$
DECLARE
  v_usuario  uuid := '65dd5296-10fc-4594-908d-990fcfe8b3b6';
  v_estornos integer;
  v_saldo    integer;
  v_soma     integer;
BEGIN
  SELECT count(*) INTO v_estornos
    FROM ledger_transactions
   WHERE kind = 'refund'
     AND description LIKE 'Estorno · incidente do laço de reanimação%';

  SELECT balance_cents INTO v_saldo
    FROM wallets WHERE user_id = v_usuario;

  SELECT coalesce(sum(amount_cents), 0) INTO v_soma
    FROM ledger_transactions WHERE user_id = v_usuario;

  IF v_estornos <> 19 OR v_saldo <> 4780 OR v_soma <> 4780 THEN
    RAISE EXCEPTION
      'ESTORNO ABORTADO — esperado estornos=19 saldo=4780 soma=4780; veio estornos=% saldo=% soma=%. Nada foi gravado.',
      v_estornos, v_saldo, v_soma;
  END IF;
END
$trava$;

COMMIT;

-- =============================================================================
-- Depois de gravado: o que ficou no banco.
-- =============================================================================

-- O extrato do incidente, com cada estorno ao lado do seu débito:
SELECT lt.created_at, lt.kind, lt.amount_cents, lt.generation_id, lt.description
FROM ledger_transactions lt
WHERE lt.generation_id IN (
  SELECT id FROM generations
  WHERE media_kind = 'video' AND status = 'succeeded'
    AND created_at >= '2026-08-29 14:00:00+00'
    AND created_at <  '2026-08-29 15:00:00+00'
)
ORDER BY lt.generation_id, lt.created_at;

-- ÚLTIMA INSTRUÇÃO — é esta que o SQL Editor mostra na tela.
-- Esperado:  19  ·  4780  ·  4780  ·  true
SELECT
  (SELECT count(*) FROM ledger_transactions
    WHERE kind = 'refund'
      AND description LIKE 'Estorno · incidente do laço de reanimação%') AS estornos,
  (SELECT balance_cents FROM wallets
    WHERE user_id = '65dd5296-10fc-4594-908d-990fcfe8b3b6')             AS saldo_carteira,
  (SELECT coalesce(sum(amount_cents), 0) FROM ledger_transactions
    WHERE user_id = '65dd5296-10fc-4594-908d-990fcfe8b3b6')             AS soma_do_ledger,
  (SELECT balance_cents FROM wallets
    WHERE user_id = '65dd5296-10fc-4594-908d-990fcfe8b3b6')
    = (SELECT coalesce(sum(amount_cents), 0) FROM ledger_transactions
        WHERE user_id = '65dd5296-10fc-4594-908d-990fcfe8b3b6')          AS bate;
