import type { APIRoute } from "astro";
import { resolveContext } from "@/pages/schema/[id].context.jsonld";
import { allJSONLD } from "./all";
import { getOntology } from "@/pages/ontology/[path].ttl";
import { jsonLdToNQuads } from "@/utils/n-quads";

export const prerender = true;

const ontology = await getOntology("spatial");
if (!ontology) throw new Error("Ontology not found");

const jsonLd = await resolveContext(allJSONLD);
const jsonLdWithoutGeometries = {
  ...jsonLd,
  features: jsonLd.features.map((item) => ({
    ...item,
    geometry: undefined,
  })),
};
const allSpatialNQuads = await jsonLdToNQuads(
  ontology,
  jsonLdWithoutGeometries,
);

export const GET: APIRoute = async () => {
  return new Response(allSpatialNQuads, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/n-quads; charset=utf-8",
    },
  });
};
