import { qrisCreate } from "../_shared/handlers.ts";
import { denoCtx } from "../_shared/supa.ts";

Deno.serve((req) => qrisCreate(req, denoCtx()));
