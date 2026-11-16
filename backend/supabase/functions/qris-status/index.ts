import { qrisStatus } from "../_shared/handlers.ts";
import { denoCtx } from "../_shared/supa.ts";

Deno.serve((req) => qrisStatus(req, denoCtx()));
