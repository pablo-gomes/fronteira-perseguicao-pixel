<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The imported game lives in src/game-app and is browser-only (three.js, MediaPipe, localStorage); load it via lazy import behind ClientOnly so SSR never evaluates it.
- Imported game files with strict-mode errors carry a // @ts-nocheck header because the original code targeted non-strict TypeScript; remove it when a file is rewritten strictly.
