<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- All app data lives in the browser via `src/lib/store.ts` (localStorage, useSyncExternalStore); backend not built yet by user request, so keep new features on this store.
- Local employee PINs use browser SHA-256 fingerprints and per-tab identities solely for frontend simulation; production permissions require server validation because browser data is editable.
- Keep deterministic restock, expiry and wholesale calculations in `src/lib/operations.ts` so business rules can be tested independently from screens.
- Shared-drawer simulations use one store shift and cross-tab storage events; never claim cross-device synchronization until a transport exists.
- Offline app-shell caching uses vite-plugin-pwa generateSW with the single preview-safe registration wrapper in `src/lib/pwa.ts` to avoid stale editor previews.
