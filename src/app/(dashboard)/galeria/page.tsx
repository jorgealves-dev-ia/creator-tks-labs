import { GalleryBrowser } from "@/components/dashboard/gallery-browser";
import { Lightbox } from "@/components/nodes/lightbox";
import { listGeneralGallery } from "@/lib/generation/history";
import { t } from "@/lib/i18n/pt-BR";

/**
 * A Galeria geral — tudo que o usuário já gerou, de todos os projetos.
 *
 * É a Galeria do projeto **sem o recorte**, e o que entra por causa disso são as
 * folhas canônicas: geradas no editor da personagem, elas nunca tiveram
 * `project_id` e por isso não aparecem em galeria de projeto nenhuma. A
 * `listProjectGallery` sempre prometeu que elas continuavam alcançáveis; esta
 * tela é onde a promessa é paga.
 *
 * O `Lightbox` é montado aqui, no topo da página, pela mesma razão de sempre —
 * é um overlay, e overlay não mora dentro do que ele cobre.
 */
export default async function GaleriaPage() {
  // A sessão é verificada no layout do grupo, e `listGeneralGallery` a verifica
  // de novo por conta própria: ela é uma Server Action, ou seja, um endpoint
  // público, e não pode depender de quem a chamou ter checado.
  const firstPage = await listGeneralGallery({});

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <div>
        <h1 className="text-lg font-medium text-ink">{t.dashboard.gallery.title}</h1>
        <p className="mt-1 text-xs text-ink-muted">{t.dashboard.gallery.subtitle}</p>
      </div>

      <GalleryBrowser initial={firstPage} />

      <Lightbox />
    </main>
  );
}
