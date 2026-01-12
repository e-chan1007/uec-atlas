import type { APIRoute } from "astro";
import { toFullURL } from "@/utils/url";
import { allData } from "./all";

export const prerender = true;

export const GET: APIRoute = async () => {
  const response = {
    "@context": toFullURL("/schema/organization.context.jsonld"),
    "@id": toFullURL("/resources/organizations"),
    "@type": ["void:Dataset", "hydra:Collection"],
    "void:title": "UEC Atlas - Organizations",
    "void:license": "https://creativecommons.org/by/4.0/",
    "void:sparqlEndpoint": toFullURL("/sparql"),
    "void:dataDump": {
      "@id": toFullURL("/resources/organizations/all"),
    },
    "hydra:totalItems": allData.length,
    "hydra:member": allData.map((organization) => ({
      "@id": organization.id,
      "@type": organization.type,
    })),
  };

  return new Response(JSON.stringify(response), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/ld+json",
      Link: [
        `<${toFullURL("/schema/organization.context.jsonld")}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
        `<${toFullURL(`/ontology/organization.ttl`)}>; rel="describedby"; type="text/turtle"`,
      ].join(", "),
    },
  });
};
