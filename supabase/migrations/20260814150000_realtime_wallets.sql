-- A carteira entra na publicação do Realtime — o saldo passa a se corrigir sozinho.
--
-- POR QUE ISTO EXISTE
-- ---------------------------------------------------------------------------
-- O saldo na tela mentia por 210 ⚡ depois de um vídeo. A cobrança do vídeo
-- acontece no webhook da fal, que é servidor puro: nenhuma resposta volta para o
-- navegador, ninguém chama a subtração otimista da fila de imagens, e nenhuma
-- re-renderização do servidor acontece. Os dois leitores do saldo — o número no
-- cabeçalho e o "Saldo:" no rodapé do bloco — ficavam parados até um F5.
--
-- `wallets.balance_cents` é **projeção do ledger, mantida por gatilho**. É o
-- exemplo canônico que a decisão de 13/08 usou para justificar a bolinha da aba:
-- *"Ela é projeção, como wallets.balance_cents é do ledger"*. E projeção quem
-- mantém é o banco — logo, quem avisa que ela mudou também é o banco.
--
-- POR QUE A CARTEIRA E NÃO AS GERAÇÕES
-- ---------------------------------------------------------------------------
-- Dava para reagir ao término de uma geração e mandar a página recarregar. Seria
-- consertar o sintoma que apareceu e deixar de pé todos os outros: estorno,
-- recarga, correção administrativa, extração — tudo que mexe no ledger sem
-- passar por um node do canvas. **A carteira é o fato; a geração é só um dos
-- motivos.** Escutar o fato cobre os motivos que ainda não existem.
--
-- Nada aqui muda dado, coluna ou política: a carteira já era legível pelo dono
-- (`wallets_select_own`), e o Realtime honra RLS, então um inscrito continua
-- recebendo apenas a própria linha. O que muda é que a mudança dela passa a ser
-- **anunciada** em vez de esperada.
--
-- Mesmo formato guardado da migration de 07/08 que abriu a publicação para
-- `projects` e `generations`: idempotente, e silenciosa se a publicação não
-- existir.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime not found, skipping';
    return;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wallets'
  ) then
    execute 'alter publication supabase_realtime add table public.wallets';
  end if;
end;
$$;

comment on column public.wallets.balance_cents is
  'Projection of the ledger, maintained by trigger, never written by product code. '
  'Published to Realtime since 14/08/2026 so both on-screen readers of the balance '
  'correct themselves when a charge lands outside the browser — the video webhook '
  'being the case that exposed it.';
