import { text } from "node:stream/consumers";
import { QueryEngine } from "@comunica/query-sparql";
import type { APIRoute } from "astro";
import { toFullURL } from "@/utils/url";

const engine = new QueryEngine();
const executeQuery = async (
  query: string,
  fetch: typeof globalThis.fetch,
  mediaType: string,
) => {
  const result = await engine.query(query, {
    sources: [
      {
        type: "file",
        value: toFullURL("/data/organizations/all"),
      },
    ],
    baseIRI: toFullURL("/"),
    fetch,
  });

  const { data } = await engine.resultToString(result, mediaType);
  return await text(data);
};

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") || "";
  const accept = request.headers.get("Accept") || "";
  const mediaType = (accept.includes("application/n-quads") || query.includes("CONSTRUCT") || query.includes("DESCRIBE"))
    ? "application/n-quads"
    : "application/sparql-results+json";
  const data = await executeQuery(
    query,
    locals.runtime.env.SELF.fetch.bind(locals.runtime.env.SELF),
    mediaType,
  );
  return new Response(data, {
    headers: {
      "Content-Type": mediaType,
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const query = (formData.get("query") as string) || "";
  const accept = request.headers.get("Accept") || "";
  const mediaType = accept.includes("application/n-quads") || query.includes("CONSTRUCT") || query.includes("DESCRIBE")
    ? "application/n-quads"
    : "application/sparql-results+json";
  const data = await executeQuery(
    query,
    locals.runtime.env.SELF.fetch.bind(locals.runtime.env.SELF),
    mediaType,
  );
  return new Response(data, {
    headers: {
      "Content-Type": mediaType,
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
