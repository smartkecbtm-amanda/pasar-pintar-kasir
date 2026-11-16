import { advisor } from "../_shared/handlers.ts";
import { denoCtx } from "../_shared/supa.ts";

Deno.serve((req) => advisor(req, denoCtx()));
