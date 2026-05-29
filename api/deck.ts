// api/deck.ts — Vercel serverless function untuk serve HTML deck dari Supabase Storage
// dengan Content-Type yang benar & TANPA CSP sandbox (supaya Reveal.js bisa jalan).
//
// Usage: /api/deck?path=presentations/12345_slide-week-22-security-hardening.html
//
// Why we need this:
//   Supabase Storage paksa Content-Type=text/plain + CSP sandbox di public URL.
//   Itu cocok untuk security/XSS prevention tapi blok HTML interaktif kayak Reveal.js.
//   Proxy ini fetch file, lalu re-serve dengan headers yang benar.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";

export default async function handler(req: Request): Promise<Response> {
  if (!SUPABASE_URL) {
    return new Response("Server misconfigured: SUPABASE_URL missing", { status: 500 });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return new Response("Missing 'path' query param", { status: 400 });
  }

  // Sanity check: hanya allow path dengan prefix presentations/ untuk safety
  if (!path.startsWith("presentations/")) {
    return new Response("Invalid path", { status: 400 });
  }

  // Fetch dari Supabase Storage public URL
  const upstreamUrl = `${SUPABASE_URL}/storage/v1/object/public/decks/${path}`;
  const upstream = await fetch(upstreamUrl);

  if (!upstream.ok) {
    return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
  }

  const body = await upstream.arrayBuffer();

  // Detect content type dari path extension
  const lower = path.toLowerCase();
  let contentType = "application/octet-stream";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    contentType = "text/html; charset=utf-8";
  } else if (lower.endsWith(".pdf")) {
    contentType = "application/pdf";
  } else if (lower.endsWith(".css")) {
    contentType = "text/css; charset=utf-8";
  } else if (lower.endsWith(".js")) {
    contentType = "application/javascript; charset=utf-8";
  } else if (lower.endsWith(".png")) {
    contentType = "image/png";
  } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    contentType = "image/jpeg";
  } else if (lower.endsWith(".svg")) {
    contentType = "image/svg+xml; charset=utf-8";
  }

  // Return dengan Content-Type yang benar, TANPA CSP sandbox
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      // SENGAJA TIDAK pakai Content-Security-Policy supaya script bisa jalan
      // Asumsi: kita hanya serve file yang kita sendiri yang upload (trusted)
    },
  });
}

export const config = {
  runtime: "edge",
};
