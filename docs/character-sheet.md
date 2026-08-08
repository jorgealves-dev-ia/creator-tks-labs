# Character Sheet — Especificação v1 (final)

> **Creator TKS Labs** · Revisado e aprovado pelo Jorge em 07/08/2026. Pronto para o Claude Code.
> Destino no repositório: `docs/character-sheet.md`, referenciado pelo `CLAUDE.md`.

---

## 1. O que este documento define

A estrutura completa do character sheet em JSON, as listas fechadas campo por campo (com a tradução fixa em inglês de cada opção), as regras de compilação do prompt e um exemplo preenchido (`@julia`). Tudo aqui parte das decisões já tomadas:

1. **Três camadas com destinos diferentes** — DNA visual (imutável), Padrões variáveis (defaults + restrições), Narrativa (nunca entra em prompt de imagem).
2. **Listas fechadas** nos campos críticos do DNA, com campo livre de "detalhes" ao lado.
3. **Extração com estados por campo** — `observado`, `inferido`, `vazio`. Extração nunca preenche a Narrativa.
4. **Imagens canônicas** são a âncora real da identidade (tabela `entity_images`).
5. **Versionamento automático** — `@julia` aponta para a versão ativa; `@julia@v1` acessa uma versão específica; versões compartilham imagens que não mudaram.

---

## 2. Onde o sheet vive (visão de banco, sem código)

O sheet inteiro é **um único JSON** guardado na coluna `sheet` (tipo `jsonb`) da tabela `entities`. Cada **versão** é um snapshot completo desse JSON — nada de guardar só "o que mudou", porque snapshot completo é mais simples de ler, comparar e restaurar.

- O **handle** (`julia`), o **número da versão**, as **datas** e qual versão está **ativa** ficam em colunas da tabela, fora do JSON. Motivo: são coisas que o banco precisa consultar e indexar; o JSON é o conteúdo criativo.
- As **imagens canônicas** ficam na tabela `entity_images`. O JSON só guarda os **IDs** delas — especificamente os **`asset_id`** (a coluna `entity_images.asset_id`, que aponta para `assets.id`). A `entity_images` tem chave primária composta `(entity_id, asset_id)` e nenhuma coluna `id` própria, então não há outra leitura possível. Quando você cria a versão 2 sem trocar o turnaround, a v2 simplesmente aponta para os mesmos IDs da v1 — é assim que "versões compartilham imagens que não mudaram" funciona na prática.
- O campo `schema_version` dentro do JSON existe para o futuro: se um dia mudarmos a estrutura do sheet, o sistema sabe ler sheets antigos sem quebrar.

---

## 3. O envelope de campo (vale para todo o DNA visual)

Cada campo do DNA não é um texto solto — é um pequeno objeto com quatro informações:

```jsonc
{
  "valor": "amendoado",     // uma opção da lista fechada daquele campo
  "detalhes": "",           // texto livre opcional ("com cílios muito longos")
  "estado": "confirmado",   // ver abaixo
  "origem": "manual"        // "manual" ou "extracao"
}
```

### Os estados

| Estado | Como surge | Entra na geração? |
|---|---|---|
| `observado` | A extração viu claramente na imagem | **Sim** |
| `inferido` | A extração deduziu sem certeza (luz ruim, ângulo, oclusão) | **Não** — fica marcado na interface até você confirmar |
| `confirmado` | Você preencheu à mão, editou, ou confirmou um `inferido` | **Sim** |
| `vazio` | Ninguém preencheu e a extração não viu | Não — o campo é simplesmente omitido do prompt |

> **✅ Aprovado em 07/08/2026:** originalmente eram três estados; o quarto, `confirmado`, resolve uma ambiguidade: quando você confirma um `inferido`, ele não pode virar `observado` (ninguém observou — você decidiu). E o que você digita à mão também merece um estado próprio. A regra prática: **só `observado` e `confirmado` entram no prompt.**

### Regras do envelope

- Campos das **Camadas 2 e 3 não têm envelope** de estado — a extração nunca os toca, então são valores simples preenchidos por você (a Camada 2 usa `valor` + `detalhes` para manter as listas fechadas; a Camada 3 é texto livre).
- `detalhes` **complementa** o valor da lista, nunca o substitui. O compilador escreve a frase fixa em inglês da opção e anexa a tradução do detalhe. Se `valor` está vazio, `detalhes` sozinho não entra no prompt — isso impede o "adjetivo subjetivo" de voltar pela porta dos fundos.
- Itens de lista (tatuagens, piercings, marcas) carregam o envelope **no item inteiro**, não em cada subcampo — uma tatuagem é observada ou não é, por inteiro.

---

## 4. A estrutura JSON completa (esqueleto)

Os comentários `//` abaixo são só explicativos — o arquivo real não os terá. Onde aparece `CAMPO`, leia: o envelope da seção 3 (`valor` / `detalhes` / `estado` / `origem`).

```jsonc
{
  "schema_version": 1,

  // ─────────────────────────────────────────────
  // CAMADA 1 — DNA VISUAL
  // Imutável dentro da versão. Entra em TODA geração de imagem.
  // Nenhum node pode sobrescrever nada daqui.
  // ─────────────────────────────────────────────
  "dna_visual": {

    "genero_apresentacao": CAMPO,   // lista 5.1
    "idade_aparente":      CAMPO,   // lista 5.2 (a idade REAL fica na Narrativa)
    "formato_rosto":       CAMPO,   // lista 5.3

    "olhos": {
      "cor":         CAMPO,         // lista 5.4
      "formato":     CAMPO,         // lista 5.5
      "espacamento": CAMPO          // lista 5.6
    },

    "sobrancelhas": {
      "formato":   CAMPO,           // lista 5.7a
      "espessura": CAMPO            // lista 5.7b
    },

    "nariz":  CAMPO,                // lista 5.8
    "labios": CAMPO,                // lista 5.9

    "pele": {
      "tom":    CAMPO,              // lista 5.10a
      "subtom": CAMPO,              // lista 5.10b
      "sardas": CAMPO               // lista 5.11
    },

    "cabelo": {
      "cor":         CAMPO,         // lista 5.12
      "textura":     CAMPO,         // lista 5.13
      "comprimento": CAMPO,         // lista 5.14 (ancorada no corpo, nunca "longo/curto")
      "reparticao":  CAMPO,         // lista 5.15a
      "franja":      CAMPO,         // lista 5.15b
      "acabamento":  CAMPO          // lista 5.15c
    },

    "corpo": {
      "altura_cm": CAMPO,           // numérico (140–210), não é lista
      "silhueta":  CAMPO,           // lista 5.16 (varia por gênero)
      "proporcoes": {               // OPCIONAL — vazio = omitido do prompt
        "busto":   CAMPO,           // lista 5.17
        "cintura": CAMPO,
        "quadril": CAMPO
      }
    },

    "marcas": {
      "tatuagens": [                // envelope no item inteiro
        {
          "posicao": "...",         // lista 5.18a
          "tamanho": "...",         // lista 5.18b
          "estilo":  "...",         // lista 5.18c
          "descricao": "...",       // livre: o desenho em si ("ramo de flores fineline")
          "estado": "...", "origem": "..."
        }
      ],
      "piercings": [
        {
          "local": "...",           // lista 5.19a
          "joia":  "...",           // lista 5.19b
          "detalhes": "",
          "estado": "...", "origem": "..."
        }
      ],
      "outras": [                   // pintas, cicatrizes, manchas
        {
          "tipo": "pinta | cicatriz | mancha",
          "posicao": "...",         // livre, mas específico ("acima do lábio, lado esquerdo")
          "descricao": "",
          "estado": "...", "origem": "..."
        }
      ]
    },

    "notas_gerais": ""              // livre, para o que não coube em nenhum campo
  },

  // ─────────────────────────────────────────────
  // CAMADA 2 — PADRÕES VARIÁVEIS
  // Defaults do sheet. Qualquer node pode sobrescrever
  // (node vence > default do sheet). Restrições valem SEMPRE.
  // Sem envelope de estado: a extração nunca preenche aqui.
  // ─────────────────────────────────────────────
  "padroes_variaveis": {
    "expressao":      { "valor": "...", "detalhes": "" },   // lista 5.20
    "pose":           { "valor": "...", "detalhes": "" },   // lista 5.21
    "traje_canonico": { "valor": "...", "detalhes": "" },   // lista 5.22 — padrão: biquíni/sunga, descalço
    "fundo_canonico": { "valor": "...", "detalhes": "" },   // lista 5.23
    "iluminacao":     { "valor": "...", "detalhes": "" },   // lista 5.24
    "enquadramento":  { "valor": "...", "detalhes": "" },   // lista 5.25

    "restricoes": [
      { "tipo": "nunca",  "regra": "usar óculos" },
      { "tipo": "sempre", "regra": "tatuagem do pulso esquerdo visível quando o pulso aparecer" }
    ]
  },

  // ─────────────────────────────────────────────
  // CAMADA 3 — NARRATIVA
  // Alimenta roteiro, storyboard e voz. NUNCA entra em prompt
  // de imagem. A extração NUNCA preenche nada aqui.
  // ─────────────────────────────────────────────
  "narrativa": {
    "nome_completo": "",
    "apelidos": [],
    "idade": null,
    "data_nascimento": null,
    "ocupacao": "",
    "personalidade": {
      "qualidades": [],
      "defeitos": [],
      "tracos_marcantes": []
    },
    "objetivos": [],
    "medos": [],
    "relacoes": [],
    "estilo_de_fala": "",
    "voz": {                        // configuração usada na Fase 3 (vídeo/fala)
      "provider": null,             // "elevenlabs" | "google"
      "voice_id": null,
      "idioma": "pt-BR",
      "descricao": ""               // "voz jovem, tom leve, fala rápido"
    }
  },

  // ─────────────────────────────────────────────
  // IMAGENS CANÔNICAS — só os IDs; os arquivos vivem em entity_images.
  // Versões novas copiam os IDs que não mudaram.
  // ─────────────────────────────────────────────
  "imagens_canonicas": {
    "turnaround_frente":       null,
    "turnaround_tres_quartos": null,
    "turnaround_perfil":       null,
    "turnaround_costas":       null,
    "folha_expressoes":        null,
    "paleta_cores":            null
  }
}
```

---

## 5. As listas fechadas, campo por campo

Cada opção tem uma **frase fixa em inglês** que o compilador usa **sempre, sem variação**. É isso que torna a consistência mecânica: escolher "na clavícula" hoje e daqui a seis meses produz exatamente a mesma string no prompt. O dicionário abaixo é parte do sistema (um arquivo de constantes), não uma sugestão de tradução.

As frases usam `{her/his/their}` onde o gênero importa — o compilador resolve pelo campo `genero_apresentacao`.

### 5.1 · Gênero de apresentação
| Opção | Frase fixa (EN) |
|---|---|
| feminino | `a woman` |
| masculino | `a man` |
| andrógino | `an androgynous person` |

### 5.2 · Idade aparente (a visual; a real fica na Narrativa)
| Opção | Frase fixa (EN) |
|---|---|
| início dos 20 | `in {her/his/their} early twenties` |
| fim dos 20 | `in {her/his/their} late twenties` |
| nos 30 | `in {her/his/their} thirties` |
| nos 40 | `in {her/his/their} forties` |
| 50 ou mais | `in {her/his/their} fifties or older` |

### 5.3 · Formato do rosto
| Opção | Frase fixa (EN) |
|---|---|
| oval | `oval face` |
| redondo | `round face` |
| quadrado | `square face with a defined jawline` |
| coração | `heart-shaped face` |
| alongado | `long oblong face` |
| diamante | `diamond-shaped face with high cheekbones` |

### 5.4 · Olhos — cor
| Opção | Frase fixa (EN) |
|---|---|
| castanho-escuro | `dark brown eyes` |
| castanho-claro (mel) | `light honey-brown eyes` |
| avelã | `hazel eyes` |
| verde | `green eyes` |
| azul | `blue eyes` |
| azul-acinzentado | `gray-blue eyes` |
| cinza | `gray eyes` |
| preto | `very dark brown, almost black eyes` |

*Heterocromia ou tons incomuns: escolher o mais próximo e descrever em `detalhes`.*

### 5.5 · Olhos — formato
| Opção | Frase fixa (EN) |
|---|---|
| amendoado | `almond-shaped eyes` |
| redondo | `round eyes` |
| caído | `downturned eyes` |
| levantado | `upturned eyes` |
| encapuzado | `hooded eyes` |
| pálpebra única (monolid) | `monolid eyes` |

### 5.6 · Olhos — espaçamento
| Opção | Frase fixa (EN) |
|---|---|
| próximos | `close-set eyes` |
| médio | `evenly spaced eyes` |
| afastados | `wide-set eyes` |

### 5.7 · Sobrancelhas
**a) Formato**
| Opção | Frase fixa (EN) |
|---|---|
| retas | `straight eyebrows` |
| arqueadas suaves | `softly arched eyebrows` |
| arqueadas marcadas | `high-arched eyebrows` |
| angulosas | `angular eyebrows` |

**b) Espessura**
| Opção | Frase fixa (EN) |
|---|---|
| finas | `thin` |
| médias | `medium-thickness` |
| grossas / cheias | `thick, full` |

*O compilador junta: espessura + formato → `thick, full, softly arched eyebrows`.*

### 5.8 · Nariz
| Opção | Frase fixa (EN) |
|---|---|
| fino e reto | `slim, straight nose` |
| arrebitado | `small upturned nose` |
| de botão | `small button nose` |
| largo | `broad nose` |
| aquilino | `aquiline nose` |

### 5.9 · Lábios
| Opção | Frase fixa (EN) |
|---|---|
| finos | `thin lips` |
| médios | `medium, balanced lips` |
| carnudos | `full lips` |
| carnudos com arco marcado | `full lips with a defined cupid's bow` |
| superior fino, inferior cheio | `thinner upper lip with a fuller lower lip` |

### 5.10 · Pele
**a) Tom**
| Opção | Frase fixa (EN) |
|---|---|
| muito clara | `very fair skin` |
| clara | `fair skin` |
| clara-dourada | `light golden skin` |
| morena-clara | `light tan skin` |
| morena | `medium tan skin` |
| morena-oliva | `medium olive skin` |
| morena-escura | `deep tan brown skin` |
| negra | `dark brown skin` |
| negra retinta | `deep, rich dark skin` |

**b) Subtom**
| Opção | Frase fixa (EN) |
|---|---|
| frio (rosado) | `with a cool pink undertone` |
| neutro | `with a neutral undertone` |
| quente (dourado) | `with a warm golden undertone` |
| oliva | `with an olive undertone` |

*Melhoria de interface para depois: mostrar essas opções como amostras de cor clicáveis, não só nomes.*

### 5.11 · Sardas
| Opção | Frase fixa (EN) |
|---|---|
| nenhuma | *(omitido do prompt)* |
| leves no nariz e bochechas | `light freckles across the nose and cheeks` |
| marcadas no rosto | `prominent freckles across the face` |
| no rosto e nos ombros | `freckles on the face and shoulders` |

### 5.12 · Cabelo — cor
| Opção | Frase fixa (EN) |
|---|---|
| preto | `black hair` |
| castanho-escuro | `dark brown hair` |
| castanho-médio | `medium brown hair` |
| castanho-claro | `light brown hair` |
| loiro-escuro | `dark blonde hair` |
| loiro | `blonde hair` |
| loiro-platinado | `platinum blonde hair` |
| ruivo-acobreado | `copper red hair` |
| ruivo-acastanhado | `auburn hair` |
| grisalho | `gray hair` |
| branco | `white hair` |
| colorido (descrever em detalhes) | `dyed {detalhe} hair` |

### 5.13 · Cabelo — textura
| Opção | Frase fixa (EN) |
|---|---|
| liso (tipo 1) | `straight hair` |
| ondulado (tipo 2) | `wavy hair` |
| cacheado (tipo 3) | `curly hair` |
| crespo (tipo 4) | `coily hair` |

*Subtipo (2B, 3C…) vai em `detalhes` se você quiser precisão extra.*

### 5.14 · Cabelo — comprimento (sempre ancorado no corpo)
| Opção | Frase fixa (EN) |
|---|---|
| raspado | `buzzed hair` |
| muito curto (pixie) | `pixie-length hair` |
| na altura do queixo | `chin-length hair` |
| nos ombros | `shoulder-length hair` |
| na clavícula | `collarbone-length hair` |
| no meio das costas | `mid-back-length hair` |
| na cintura | `waist-length hair` |

*Este campo é o exemplo perfeito do porquê das listas fechadas: "cabelo longo" nunca mais.*

### 5.15 · Cabelo — corte
**a) Repartição**
| Opção | Frase fixa (EN) |
|---|---|
| ao centro | `center-parted` |
| lateral | `side-parted` |
| sem repartição (para trás) | `brushed back with no part` |

**b) Franja**
| Opção | Frase fixa (EN) |
|---|---|
| sem franja | *(omitido)* |
| reta | `with straight blunt bangs` |
| cortina | `with curtain bangs` |
| lateral | `with side-swept bangs` |

**c) Acabamento**
| Opção | Frase fixa (EN) |
|---|---|
| pontas retas | `with blunt-cut ends` |
| em camadas | `layered` |
| desfiado | `with textured, feathered layers` |

### 5.16 · Corpo — silhueta (lista muda conforme o gênero)
**Feminino**
| Opção | Frase fixa (EN) |
|---|---|
| magra | `slim, slender build` |
| esbelta tonificada | `slender, lightly toned build` |
| atlética definida | `athletic, defined build` |
| fitness musculosa | `muscular fitness physique` |
| curvilínea | `curvy build` |
| violão | `hourglass figure` |
| plus size | `plus-size build` |

**Masculino**
| Opção | Frase fixa (EN) |
|---|---|
| magro | `lean build` |
| atlético | `athletic build` |
| musculoso definido | `muscular, defined physique` |
| muito musculoso, veias visíveis | `highly muscular physique with visible veins` |
| robusto | `heavyset build` |

### 5.17 · Corpo — proporções (opcional) ✅ mantido, decidido em 07/08/2026
| Campo | Opções | Frases fixas (EN) |
|---|---|---|
| busto | pequeno · médio · volumoso | `small bust` · `medium bust` · `full bust` |
| cintura | marcada · reta | `defined waist` · `straight waist` |
| quadril | estreito · médio · largo | `narrow hips` · `medium hips` · `wide hips` |

### 5.18 · Tatuagens (por item)
**a) Posição** — pulso interno esquerdo/direito (`inner left/right wrist`) · antebraço esq./dir. (`left/right forearm`) · bíceps (`upper arm`) · ombro (`shoulder`) · escápula (`shoulder blade`) · clavícula (`collarbone`) · costelas (`ribcage`) · lombar (`lower back`) · nuca (`nape of the neck`) · atrás da orelha (`behind the ear`) · coxa (`thigh`) · panturrilha (`calf`) · tornozelo (`ankle`) · mão/dedos (`hand`)

**b) Tamanho** — pequena (`small`) · média (`medium-sized`) · grande (`large`)

**c) Estilo** — fineline (`fine-line`) · realista (`realistic`) · tradicional old school (`traditional old-school`) · aquarela (`watercolor`) · geométrico (`geometric`) · tribal (`tribal`) · lettering (`script lettering`)

*O compilador monta: `a small fine-line tattoo of {descricao} on the inner left wrist`.*

### 5.19 · Piercings (por item)
**a) Local** — lóbulo (`earlobe`) · cartilagem/hélix (`helix`) · asa do nariz (`nostril`) · septo (`septum`) · sobrancelha (`eyebrow`) · lábio (`lip`) · umbigo (`navel`) · língua (`tongue`)

**b) Joia** — argola pequena (`a small hoop`) · pino (`a small stud`)

### 5.20 · Expressão (padrão da Camada 2)
| Opção | Frase fixa (EN) |
|---|---|
| neutra serena | `neutral, relaxed expression` |
| sorriso suave (fechado) | `soft closed-lip smile` |
| sorriso aberto | `warm open smile` |
| confiante | `confident expression` |
| séria | `serious expression` |

### 5.21 · Pose (padrão)
| Opção | Frase fixa (EN) |
|---|---|
| em pé, frontal | `standing, facing the camera` |
| em pé, 3/4 | `standing at a three-quarter angle` |
| sentada | `seated, natural posture` |
| caminhando | `mid-stride walking pose` |

### 5.22 · Traje canônico ✅ decidido em 07/08/2026
| Opção | Frase fixa (EN) |
|---|---|
| biquíni liso neutro *(padrão feminino)* | `wearing a plain, neutral-tone two-piece swimsuit, barefoot` |
| sunga lisa neutra *(padrão masculino)* | `wearing plain, neutral-tone swim briefs, barefoot` |
| compressão esportiva opaca *(alternativa/fallback)* | `wearing an opaque, tight-fitting athletic compression top and shorts, non-transparent matte fabric, arms and legs uncovered, barefoot` |

**Estratégia de moldura (framing):** o prompt da geração canônica nunca fala em corpo pela nudez — ele se apresenta com a linguagem técnica padrão da indústria, que os modelos reconhecem como finalidade legítima: `professional full-body character reference sheet, neutral studio background, even lighting, for character silhouette and proportion consistency`. Nenhuma palavra sugestiva, nenhuma menção a pele além do tom.

**Fallback automático:** se o modelo recusar a geração ou degradar o resultado com o traje de banho, o sistema refaz **uma vez** a mesma geração com a opção de compressão esportiva, registra no histórico que houve fallback e mostra isso na interface. Sem surpresa silenciosa: você sempre sabe qual traje foi usado.

### 5.23 · Fundo canônico
| Opção | Frase fixa (EN) |
|---|---|
| cinza claro sem textura | `seamless light gray studio background` |
| branco limpo | `clean white studio background` |
| cinza médio | `seamless medium gray studio background` |

### 5.24 · Iluminação (padrão)
| Opção | Frase fixa (EN) |
|---|---|
| estúdio difusa | `soft, diffused studio lighting` |
| luz natural de janela | `natural window light` |
| golden hour | `warm golden-hour sunlight` |
| dia nublado | `soft overcast daylight` |

### 5.25 · Enquadramento (padrão)
| Opção | Frase fixa (EN) |
|---|---|
| corpo inteiro | `full-body shot` |
| meio corpo | `waist-up shot` |
| retrato | `head-and-shoulders portrait` |

---

## 6. Regras de compilação do prompt

Estas regras são o contrato entre o sheet e o node de geração. Elas vão para o `CLAUDE.md` como invariantes.

1. **Ordem fixa do bloco de identidade no prompt:** gênero + idade aparente → rosto (formato, olhos, sobrancelhas, nariz, lábios) → pele (tom, subtom, sardas) → cabelo (cor, textura, comprimento, corte) → corpo (altura, silhueta, proporções) → marcas (tatuagens, piercings, outras). Ordem fixa = prompts comparáveis entre gerações.

2. **Só entram campos `observado` ou `confirmado`.** Campos `inferido` e `vazio` são omitidos por completo. Omissão honesta é melhor que chute: o modelo de imagem decide livremente o que não foi especificado, e você vê na interface exatamente o que ainda está em aberto.

3. **DNA nunca é sobrescrevível.** Nenhum node, nenhum @ e nenhum prompt de usuário pode contradizer a Camada 1. Se um node pedir "cabelo loiro" para a `@julia` (que é castanha), o compilador ignora a contradição e mantém o DNA — e a interface avisa o porquê.

4. **Camada 2 obedece à hierarquia: input do node > default do sheet.** Se o node de geração define cenário, o `fundo_canonico` não entra. Se não define, entra o default.

5. **Restrições entram sempre**, ao final do prompt, independentemente do que o node definiu: `nunca` vira instrução negativa (`never wearing glasses`), `sempre` vira instrução afirmativa.

6. **Narrativa nunca entra em prompt de imagem.** Ela é lida apenas pelos compiladores de roteiro, storyboard e voz.

7. **Tradução determinística.** Opções de lista fechada usam a frase fixa do dicionário da seção 5, copiada literalmente — nunca re-traduzidas por IA a cada geração. A IA (Claude, no papel de orquestrador) só traduz e harmoniza os campos livres (`detalhes`, `descricao`, `restricoes`) e monta o JSON final em inglês no formato que o modelo de imagem espera.

8. **Imagens canônicas acompanham toda geração** que aceite referência de imagem (a maioria dos modelos atuais aceita). O texto guia; a imagem prova.

9. **O `prompt_compiled` é salvo em cada geração**, como já definido na Fase 0. É o registro histórico: mesmo que a `@julia` evolua para a v5, você sempre sabe exatamente com que características cada imagem antiga foi gerada.

10. **Geração canônica tem moldura própria e fallback automático.** As gerações de turnaround e folha de expressões sempre abrem com a moldura de reference sheet (seção 5.22), usam o traje canônico do sheet (padrão: biquíni/sunga, descalço) e, em caso de recusa ou degradação pelo modelo, refazem uma única vez com a compressão esportiva opaca — com o fallback registrado no histórico e visível na interface.

---

## 7. Exemplo preenchido — `@julia` (v1)

Um exemplo realista, com campos vindos de extração (incluindo dois `inferido` aguardando confirmação e um `vazio`), para você sentir o formato na prática.

```json
{
  "schema_version": 1,

  "dna_visual": {
    "genero_apresentacao": { "valor": "feminino", "detalhes": "", "estado": "confirmado", "origem": "manual" },
    "idade_aparente": { "valor": "inicio_dos_20", "detalhes": "", "estado": "observado", "origem": "extracao" },
    "formato_rosto": { "valor": "oval", "detalhes": "", "estado": "observado", "origem": "extracao" },

    "olhos": {
      "cor": { "valor": "verde", "detalhes": "", "estado": "inferido", "origem": "extracao" },
      "formato": { "valor": "amendoado", "detalhes": "", "estado": "observado", "origem": "extracao" },
      "espacamento": { "valor": "medio", "detalhes": "", "estado": "observado", "origem": "extracao" }
    },

    "sobrancelhas": {
      "formato": { "valor": "arqueadas_suaves", "detalhes": "", "estado": "observado", "origem": "extracao" },
      "espessura": { "valor": "grossas", "detalhes": "", "estado": "observado", "origem": "extracao" }
    },

    "nariz": { "valor": "fino_e_reto", "detalhes": "", "estado": "observado", "origem": "extracao" },
    "labios": { "valor": "carnudos_com_arco_marcado", "detalhes": "", "estado": "observado", "origem": "extracao" },

    "pele": {
      "tom": { "valor": "morena_clara", "detalhes": "", "estado": "observado", "origem": "extracao" },
      "subtom": { "valor": "quente", "detalhes": "", "estado": "inferido", "origem": "extracao" },
      "sardas": { "valor": "leves_nariz_bochechas", "detalhes": "", "estado": "observado", "origem": "extracao" }
    },

    "cabelo": {
      "cor": { "valor": "castanho_escuro", "detalhes": "", "estado": "observado", "origem": "extracao" },
      "textura": { "valor": "liso", "detalhes": "", "estado": "observado", "origem": "extracao" },
      "comprimento": { "valor": "na_clavicula", "detalhes": "", "estado": "observado", "origem": "extracao" },
      "reparticao": { "valor": "ao_centro", "detalhes": "", "estado": "observado", "origem": "extracao" },
      "franja": { "valor": "sem_franja", "detalhes": "", "estado": "confirmado", "origem": "manual" },
      "acabamento": { "valor": "pontas_retas", "detalhes": "", "estado": "confirmado", "origem": "manual" }
    },

    "corpo": {
      "altura_cm": { "valor": 168, "detalhes": "", "estado": "confirmado", "origem": "manual" },
      "silhueta": { "valor": "esbelta_tonificada", "detalhes": "", "estado": "confirmado", "origem": "manual" },
      "proporcoes": {
        "busto": { "valor": "medio", "detalhes": "", "estado": "confirmado", "origem": "manual" },
        "cintura": { "valor": "marcada", "detalhes": "", "estado": "confirmado", "origem": "manual" },
        "quadril": { "valor": "medio", "detalhes": "", "estado": "vazio", "origem": "extracao" }
      }
    },

    "marcas": {
      "tatuagens": [
        {
          "posicao": "pulso_interno_esquerdo",
          "tamanho": "pequena",
          "estilo": "fineline",
          "descricao": "ramo de flores minimalista",
          "estado": "confirmado",
          "origem": "manual"
        }
      ],
      "piercings": [
        { "local": "lobulo", "joia": "pino", "detalhes": "um em cada orelha", "estado": "observado", "origem": "extracao" }
      ],
      "outras": [
        { "tipo": "pinta", "posicao": "acima do lábio, lado esquerdo", "descricao": "pequena e discreta", "estado": "observado", "origem": "extracao" }
      ]
    },

    "notas_gerais": ""
  },

  "padroes_variaveis": {
    "expressao": { "valor": "sorriso_suave", "detalhes": "" },
    "pose": { "valor": "em_pe_frontal", "detalhes": "" },
    "traje_canonico": { "valor": "biquini_neutro", "detalhes": "" },
    "fundo_canonico": { "valor": "cinza_claro", "detalhes": "" },
    "iluminacao": { "valor": "estudio_difusa", "detalhes": "" },
    "enquadramento": { "valor": "corpo_inteiro", "detalhes": "" },
    "restricoes": [
      { "tipo": "nunca", "regra": "usar óculos" },
      { "tipo": "sempre", "regra": "tatuagem do pulso esquerdo visível quando o pulso aparecer na imagem" }
    ]
  },

  "narrativa": {
    "nome_completo": "Julia Andrade",
    "apelidos": ["Ju"],
    "idade": 24,
    "data_nascimento": null,
    "ocupacao": "criadora de conteúdo de moda e lifestyle",
    "personalidade": {
      "qualidades": ["espontânea", "carismática"],
      "defeitos": ["ansiosa", "impaciente"],
      "tracos_marcantes": ["fala com as mãos", "ri alto"]
    },
    "objetivos": ["viver de conteúdo", "lançar uma marca própria"],
    "medos": ["irrelevância"],
    "relacoes": [],
    "estilo_de_fala": "informal, jovem, com gírias leves de internet",
    "voz": { "provider": null, "voice_id": null, "idioma": "pt-BR", "descricao": "voz jovem, tom leve e animado" }
  },

  "imagens_canonicas": {
    "turnaround_frente": "b3f2…",
    "turnaround_tres_quartos": "a91c…",
    "turnaround_perfil": null,
    "turnaround_costas": null,
    "folha_expressoes": null,
    "paleta_cores": null
  }
}
```

**O que este exemplo demonstra:** os olhos verdes estão `inferido` (a foto tinha luz amarelada) — então **nenhuma geração da Julia menciona cor de olhos** até você confirmar, e a interface mostra o campo em amarelo pedindo sua atenção. O quadril está `vazio` e é simplesmente omitido. E o bloco de identidade compilado a partir do que está válido hoje seria:

> `a woman in her early twenties, oval face, almond-shaped, evenly spaced eyes, thick, full, softly arched eyebrows, slim straight nose, full lips with a defined cupid's bow, light tan skin, light freckles across the nose and cheeks, dark brown straight collarbone-length hair, center-parted, with blunt-cut ends, 168 cm tall, slender, lightly toned build, medium bust, defined waist, a small fine-line tattoo of a minimalist flower branch on the inner left wrist, a small stud earring in each earlobe, a small beauty mark above the left side of the lip`

---

## 8. Registro de decisões (todas tomadas em 07/08/2026)

**Nº 1 — Quarto estado `confirmado`. ✅ APROVADO.** Além de `observado`, `inferido` e `vazio`, existe `confirmado` — o estado que um campo ganha quando o Jorge o valida (confirmando um `inferido` ou preenchendo à mão). Diferencia "a extração viu" de "o Jorge decidiu". Só `observado` e `confirmado` entram no prompt. Detalhes na seção 3.

**Nº 2 — Traje canônico padrão. ✅ DECIDIDO:** biquíni (feminino) / sunga (masculino), sempre descalço. O prompt canônico usa a moldura técnica de *character reference sheet* — linguagem que comunica finalidade de estudo de silhueta sem nenhum termo sugestivo. Se um modelo recusar ou degradar, fallback automático (uma tentativa) para compressão esportiva opaca, ajustada ao corpo, sem transparência, braços e pernas descobertos, descalço — sempre registrado e visível. Detalhes na seção 5.22 e na regra de compilação nº 10.

**Nº 3 — Proporções corporais (busto/cintura/quadril). ✅ MANTIDAS** como bloco opcional dentro de `corpo`. Vazias, são simplesmente omitidas do prompt; preenchidas, travam a silhueta entre gerações. Listas na seção 5.17.

---

## 9. Fora do escopo deste documento (de propósito)

A tela do formulário (como os campos aparecem, o fluxo de confirmação dos `inferido`), o processo de gerar as imagens canônicas (turnaround e expressões) e a mecânica de criação de versões no banco. Cada um merece sua própria conversa curta — este documento fecha primeiro **o quê** se guarda; depois vem **como** se preenche e se exibe.