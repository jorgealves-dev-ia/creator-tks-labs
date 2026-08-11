import { z } from "zod";

/**
 * What a stored `prompt_compiled.structure` is, as a schema.
 *
 * Lives apart from the Server Action that reads it for two reasons, and the
 * second one is the one that moved it here.
 *
 * A module marked `"use server"` may only export async functions, so a schema
 * declared inside one is unreachable from anywhere else — including from a
 * harness that wants to prove it can still read a row written last week. A
 * validator nothing can exercise outside the app it runs in is a validator you
 * have to take on faith, and this one guards the only history this product has.
 *
 * And it is not server code in the first place. It is a data contract: the shape
 * the compiler writes and the screen reads, with no session, no database and no
 * privilege of its own.
 */

/**
 * The stored shape, validated rather than cast: this is jsonb coming back out of
 * the database, which is a boundary like any other. A row written by an older
 * version of the compiler simply arrives without a structure, and the screen
 * shows the text it does have instead of failing.
 */
export const structureSchema = z.object({
  estilo: z.object({
    chave: z.string(),
    frase: z.string(),
    reforco: z.string(),
    origem: z.enum(["node", "personagem", "padrao"]),
  }),
  personagem: z
    .object({
      handle: z.string(),
      versao: z.number(),
      entity_version_id: z.string(),
      folha_asset_id: z.string().nullable(),
    })
    .nullable(),
  /** Absent on every generation from before the single-photograph clause. */
  foto_unica: z.string().nullable().default(null),
  identidade: z.array(z.string()).default([]),
  /**
   * Read as a list, accepted as either.
   *
   * Until 2026-08-09 this was a single sentence; it became a list when the
   * identity reinforcement was added beside it. Both shapes are in the database
   * and neither can be rewritten — a stored prompt is the record of a generation
   * that already happened. So the reader adapts to what was written, which is
   * the whole reason this schema is looser than the compiler's own types.
   */
  ancora: z
    .union([z.array(z.string()), z.string().transform((sentence) => [sentence])])
    .default([]),
  traje_canonico: z.string().nullable().default(null),
  cena_padrao: z.array(z.string()).default([]),
  cena_usuario: z.object({ pt: z.string(), en: z.string() }).nullable().default(null),
  /**
   * Absent on every generation from before the scene adjustments existed.
   * `campo` is a plain string for the same reason `tipo` is: this is history.
   */
  ajustes_cena: z
    .array(z.object({ campo: z.string(), chave: z.string(), frase: z.string() }))
    .default([]),
  referencias: z
    .array(
      z.object({
        ordem: z.number(),
        asset_id: z.string(),
        tipo: z.string().nullable().default(null),
        origem: z.string().default(""),
        instrucao_pt: z.string().default(""),
        instrucao_en: z.string().default(""),
        diretiva_en: z.string().default(""),
        /** Absent on every generation from before the fidelity clauses existed. */
        fidelidade_en: z.string().nullable().default(null),
        /**
         * Absent on every generation from before groups existed, and written
         * under two different pairs of names since.
         *
         * `produto_id` / `produto_nome` were the names while a product's photos
         * were the only group there was; `grupo_id` / `rotulo` are the names
         * from 10/08/2026, when an input node holding five images turned out to
         * be the same mechanism. **Both are read, and only the second is
         * written** — history is append-only, so a row from last week is not
         * going to start using this week's vocabulary, and the screen should not
         * have to know which week it came from.
         *
         * The ids are plain strings for the same reason `tipo` is: a product
         * archived since then still has to be readable here.
         */
        grupo: z
          .object({
            grupo_id: z.string().optional(),
            rotulo: z.string().optional(),
            produto_id: z.string().optional(),
            produto_nome: z.string().optional(),
            ordens: z.array(z.number()).default([]),
          })
          .nullable()
          .default(null)
          .transform((grupo) =>
            grupo === null
              ? null
              : {
                  id: grupo.grupo_id ?? grupo.produto_id ?? "",
                  rotulo: grupo.rotulo ?? grupo.produto_nome ?? "",
                  ordens: grupo.ordens,
                },
          ),
        unidade_en: z.string().nullable().default(null),
        /** Ausente em toda geração anterior aos inputs especializados. */
        papel: z.string().nullable().default(null),
        papel_en: z.string().nullable().default(null),
      }),
    )
    .default([]),
  /**
   * Absent on every generation from before the mute switch existed, which reads
   * as null — and null is exactly right for them: nothing was silenced, because
   * nothing could be.
   */
  referencias_mudas: z
    .object({
      quantidade: z.number(),
      asset_ids: z.array(z.string()).default([]),
    })
    .nullable()
    .default(null),
  restricoes: z.array(z.string()).default([]),
  regra_diretor: z.enum(["prompt_dirige", "padroes_da_personagem"]),
  /** A opção de ângulo que foi escolhida e não entrou. Ausente lê como null. */
  angulo_em_pausa: z.string().nullable().default(null),
});

/**
 * What a stored structure is, which is deliberately looser than what the
 * compiler produces today.
 *
 * `tipo` and `origem` are plain strings here rather than the unions of
 * references.ts, and that is the point: this is history. A generation from a
 * month ago may name a kind that has since been renamed or retired, and the
 * honest thing is to show what it said — the same reasoning that makes the
 * compiler tolerate a dictionary key it no longer recognises instead of
 * pretending the sheet is broken.
 */
export type StoredPromptStructure = z.infer<typeof structureSchema>;
