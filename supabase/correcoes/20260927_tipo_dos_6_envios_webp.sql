-- =============================================================================
-- CORREÇÃO · o tipo de 6 envios que são WebP e estão registrados como JPEG
-- 27/09/2026 · Frente 1 — docs/plano-produto-diz.md, F1a
--
-- Autorizado pelo Jorge em 26/09/2026 (decisão 4 do fechamento da noite):
-- "script que o dono roda, só a coluna de tipo". Rodar no SQL Editor do Supabase.
--
-- -----------------------------------------------------------------------------
-- O que aconteceu
-- -----------------------------------------------------------------------------
--
-- A varredura de 26/09 leu os 32 primeiros bytes dos 104 arquivos do acervo:
-- 98 batem com `assets.mime_type`, 6 não. Os 6 são ENVIOS declarados
-- `image/jpeg` cujos bytes começam com `RIFF … WEBP` — são WebP. O navegador
-- anuncia o tipo pela EXTENSÃO do arquivo, e o envio gravava o que o navegador
-- dizia. Um deles é a foto da blusa (`06778db7`), que a Anthropic recusou com
-- 400 na F0 por causa disso.
--
-- O caminho foi consertado na F1a (o tipo passa a ser lido nos bytes, e o
-- carregador que manda imagem ao provedor já lê os bytes — os 6 vão certos ao
-- provedor MESMO SEM este script). Este script corrige o REGISTRO.
--
-- -----------------------------------------------------------------------------
-- O que muda, e o que NÃO muda
-- -----------------------------------------------------------------------------
--
-- MUDA:     `assets.mime_type`, de 'image/jpeg' para 'image/webp', em 6 linhas.
--
-- NÃO MUDA: o `storage_path` (os caminhos continuam terminando em `.jpg`), o
--           nome do arquivo, o `label`, o tamanho, a largura e a altura; os
--           arquivos no Storage (nem os bytes, nem os metadados do objeto — que
--           também dizem `image/jpeg` e ficam como estão, por decisão do dono:
--           só a coluna de tipo); e as 26 gerações que citam esses arquivos.
--
-- `assets` não tem gatilho nem `updated_at` (conferido em 27/09): o UPDATE
-- muda exatamente uma coluna.
--
-- -----------------------------------------------------------------------------
-- Por que 6 ids escritos à mão, e o que impede um id errado
-- -----------------------------------------------------------------------------
--
-- O banco não lê bytes de arquivo: quem sabe que são WebP é a varredura, e os
-- 6 ids vêm da evidência dela (`scratchpad/evidencias/produto-diz-f0/
-- varredura-mime-assets.md`). Para um caractere trocado não corrigir a linha
-- errada, cada id só casa junto com o CAMINHO e o TAMANHO conferidos na
-- varredura — três chaves que precisam bater juntas.
--
-- -----------------------------------------------------------------------------
-- A trava é uma EXCEÇÃO, não uma leitura humana
-- -----------------------------------------------------------------------------
--
-- O SQL Editor mostra só o resultado da ÚLTIMA instrução — lição do script de
-- 29/08. Então o UPDATE e as conferências moram no mesmo bloco `DO`, que
-- levanta exceção se qualquer número divergir; a exceção desfaz tudo sozinha.
-- O bloco confere:
--
--   1. as 6 linhas terminam `image/webp`, e nenhuma delas `image/jpeg`;
--   2. NADA além do tipo mudou nelas — a impressão digital de todas as outras
--      colunas é a mesma antes e depois;
--   3. as gerações que citam os 6 são as mesmas, byte a byte, antes e depois;
--   4. nenhuma outra linha de `assets` mudou de tipo.
--
-- -----------------------------------------------------------------------------
-- Rodar duas vezes é seguro
-- -----------------------------------------------------------------------------
--
-- O UPDATE só pega linha que ainda diz 'image/jpeg'. Na segunda execução ele
-- muda 0 linhas, e a trava passa igual, porque confere o ESTADO FINAL.
--
-- -----------------------------------------------------------------------------
-- A prova depois de rodar — do Claude, 0 ⚡
-- -----------------------------------------------------------------------------
--
-- A varredura, de novo, sobre os mesmos 104 arquivos de 26/09:
-- 104 batem / 0 divergem / 0 ilegíveis.
-- =============================================================================

BEGIN;

DO $correcao$
DECLARE
  -- As 6, com as duas chaves que a varredura conferiu junto com o id.
  v_alvos CONSTANT jsonb := '[
    {"id": "b34c277f-9064-4325-a47e-55d2cafdd792", "path": "65dd5296-10fc-4594-908d-990fcfe8b3b6/references/ed5df5df-d5cb-4932-80eb-711c3eae9835.jpg", "bytes": 77662},
    {"id": "0b844358-faa1-4c17-8387-97c12d141092", "path": "65dd5296-10fc-4594-908d-990fcfe8b3b6/references/d2c94371-5852-430c-8238-ff940aeaf458.jpg", "bytes": 73170},
    {"id": "7b0173b1-2a14-4a0b-b81a-46cbf3f87cfa", "path": "65dd5296-10fc-4594-908d-990fcfe8b3b6/references/54088877-9dbb-4fd5-acce-d80063815636.jpg", "bytes": 36624},
    {"id": "c0abcd5b-7b0c-4f90-8fd1-4e0a2662c754", "path": "65dd5296-10fc-4594-908d-990fcfe8b3b6/references/87e7bd48-21c6-4b0f-8e4c-68069425d81a.jpg", "bytes": 12924},
    {"id": "631695ed-17fd-49f3-869d-b508b9fc4b65", "path": "65dd5296-10fc-4594-908d-990fcfe8b3b6/references/21d82504-9759-4a5a-b826-f635582d9a19.jpg", "bytes": 34916},
    {"id": "06778db7-8a84-4fcb-88ab-1f19e0a69743", "path": "65dd5296-10fc-4594-908d-990fcfe8b3b6/references/91ba99d9-e37c-4c85-b90f-ac9fc16ed353.jpg", "bytes": 21878}
  ]';
  v_ids uuid[];
  v_mudadas integer;
  v_webp integer;
  v_jpeg integer;
  v_resto_antes text;
  v_resto_depois text;
  v_geracoes integer;
  v_geracoes_antes text;
  v_geracoes_depois text;
  v_outros_antes text;
  v_outros_depois text;
BEGIN
  SELECT array_agg((a ->> 'id')::uuid) INTO v_ids FROM jsonb_array_elements(v_alvos) a;

  -- ── ANTES ──────────────────────────────────────────────────────────────────
  -- Tudo das 6 linhas MENOS o tipo: tem de sair igual.
  SELECT md5(string_agg(concat_ws('|', id, user_id, kind, source, storage_bucket, storage_path,
                                   byte_size, width, height, duration_ms, created_at, label,
                                   derived_from_asset_id, derived_from_ms, project_id), '¶' ORDER BY id))
    INTO v_resto_antes
    FROM assets WHERE id = ANY (v_ids);

  -- As gerações que citam qualquer um dos 6, em `params` ou no texto compilado.
  SELECT count(*), md5(string_agg(concat_ws('|', g.id, g.status, g.params, g.prompt_compiled,
                                            g.result_asset_id, g.updated_at), '¶' ORDER BY g.id))
    INTO v_geracoes, v_geracoes_antes
    FROM generations g
   WHERE EXISTS (SELECT 1 FROM unnest(v_ids) i
                  WHERE (g.params::text || coalesce(g.prompt_compiled::text, '')) LIKE '%' || i::text || '%');

  -- O tipo de todas as OUTRAS linhas de `assets`: nenhuma pode mudar.
  SELECT md5(string_agg(id::text || '=' || mime_type, '¶' ORDER BY id))
    INTO v_outros_antes
    FROM assets WHERE NOT (id = ANY (v_ids));

  -- ── A CORREÇÃO: só `mime_type`, só onde id + caminho + tamanho batem ─────
  UPDATE assets a
     SET mime_type = 'image/webp'
    FROM jsonb_array_elements(v_alvos) alvo
   WHERE a.id = (alvo ->> 'id')::uuid
     AND a.storage_path = alvo ->> 'path'
     AND a.byte_size = (alvo ->> 'bytes')::bigint
     AND a.kind = 'image'
     AND a.source = 'upload'
     AND a.mime_type = 'image/jpeg';   -- idempotência: a segunda execução não acha nada

  GET DIAGNOSTICS v_mudadas = ROW_COUNT;

  -- ── DEPOIS ────────────────────────────────────────────────────────────────
  SELECT count(*) FILTER (WHERE mime_type = 'image/webp'),
         count(*) FILTER (WHERE mime_type = 'image/jpeg')
    INTO v_webp, v_jpeg
    FROM assets a
    JOIN jsonb_array_elements(v_alvos) alvo
      ON a.id = (alvo ->> 'id')::uuid
     AND a.storage_path = alvo ->> 'path'
     AND a.byte_size = (alvo ->> 'bytes')::bigint;

  SELECT md5(string_agg(concat_ws('|', id, user_id, kind, source, storage_bucket, storage_path,
                                   byte_size, width, height, duration_ms, created_at, label,
                                   derived_from_asset_id, derived_from_ms, project_id), '¶' ORDER BY id))
    INTO v_resto_depois
    FROM assets WHERE id = ANY (v_ids);

  SELECT md5(string_agg(concat_ws('|', g.id, g.status, g.params, g.prompt_compiled,
                                   g.result_asset_id, g.updated_at), '¶' ORDER BY g.id))
    INTO v_geracoes_depois
    FROM generations g
   WHERE EXISTS (SELECT 1 FROM unnest(v_ids) i
                  WHERE (g.params::text || coalesce(g.prompt_compiled::text, '')) LIKE '%' || i::text || '%');

  SELECT md5(string_agg(id::text || '=' || mime_type, '¶' ORDER BY id))
    INTO v_outros_depois
    FROM assets WHERE NOT (id = ANY (v_ids));

  -- ── A TRAVA ───────────────────────────────────────────────────────────────
  IF v_webp <> 6 OR v_jpeg <> 0
     OR v_mudadas > 6
     OR v_resto_depois IS DISTINCT FROM v_resto_antes
     OR v_geracoes_depois IS DISTINCT FROM v_geracoes_antes
     OR v_outros_depois IS DISTINCT FROM v_outros_antes THEN
    RAISE EXCEPTION
      'CORREÇÃO ABORTADA — esperado webp=6 jpeg=0, o resto das 6 linhas igual, as gerações iguais e nenhuma outra linha mudada; veio webp=% jpeg=% mudadas=% resto_igual=% geracoes_iguais=% outras_iguais=%. Nada foi gravado.',
      v_webp, v_jpeg, v_mudadas,
      v_resto_depois IS NOT DISTINCT FROM v_resto_antes,
      v_geracoes_depois IS NOT DISTINCT FROM v_geracoes_antes,
      v_outros_depois IS NOT DISTINCT FROM v_outros_antes;
  END IF;

  RAISE NOTICE 'Corrigidas nesta execução: % linha(s). Gerações que citam os 6: % — intactas.', v_mudadas, v_geracoes;
END
$correcao$;

COMMIT;

-- =============================================================================
-- ÚLTIMA INSTRUÇÃO — é esta que o SQL Editor mostra na tela.
-- Esperado: seis linhas, todas com  image/webp  e o caminho ainda em  .jpg
-- =============================================================================
SELECT left(id::text, 8) AS asset, mime_type, right(storage_path, 4) AS fim_do_caminho, byte_size, label
  FROM assets
 WHERE id IN ('b34c277f-9064-4325-a47e-55d2cafdd792', '0b844358-faa1-4c17-8387-97c12d141092',
              '7b0173b1-2a14-4a0b-b81a-46cbf3f87cfa', 'c0abcd5b-7b0c-4f90-8fd1-4e0a2662c754',
              '631695ed-17fd-49f3-869d-b508b9fc4b65', '06778db7-8a84-4fcb-88ab-1f19e0a69743')
 ORDER BY created_at;
