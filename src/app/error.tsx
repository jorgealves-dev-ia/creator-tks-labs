"use client";

import { Button } from "@/components/ui/button";

export default function ErrorScreen({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div>
        <h1 className="text-base font-medium text-ink">Algo deu errado</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Não conseguimos carregar esta tela. Tente de novo.
        </p>
      </div>
      <Button onClick={reset} className="h-9 px-4">
        Tentar de novo
      </Button>
    </main>
  );
}
