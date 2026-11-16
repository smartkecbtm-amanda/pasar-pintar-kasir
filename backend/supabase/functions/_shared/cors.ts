/** CORS dan helper respons. Batasi asal dengan secret ALLOWED_ORIGIN (mis. https://kasir.contoh.com); default "*". */
export function corsHeaders(env: (k: string) => string | undefined): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env("ALLOWED_ORIGIN") || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
