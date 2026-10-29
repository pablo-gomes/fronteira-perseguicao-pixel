import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameApp = lazy(() => import("@/game-app/App"));

const title = "Fronteira: Perseguição Pixel";
const description =
  "Alcance o suspeito em uma corrida tática retrô por cinco capítulos na fronteira com suporte a teclado, toque e sensor de câmera.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <GameApp />
      </Suspense>
    </ClientOnly>
  );
}
