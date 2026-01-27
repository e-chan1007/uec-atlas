import type { APIRoute } from "astro";
import { n3reasoner } from "eyereasoner";
import jsonld, { type JsonLdDocument } from "jsonld";
import { getOntology } from "@/pages/ontology/[path].ttl";
import { resolveContext } from "@/pages/schema/[id].context.jsonld";
import {
  blankNode,
  defaultGraph,
  initOxigraph,
  literal,
  namedNode,
  type Quad_Predicate,
  type Quad_Subject,
  quad,
  Store,
} from "@/utils/oxigraph";
import { allJSONLD } from "./all";

export const prerender = true;

const jsonLd = await resolveContext(allJSONLD);
const nQuads = (await jsonld.toRDF(jsonLd as JsonLdDocument, {
  format: "application/n-quads",
})) as string;

const owlRules: Record<string, string> = import.meta.glob(
  "/node_modules/eye-reasoning/rpo/owl-*.n3",
  {
    eager: true,
    query: "raw",
    import: "default",
  },
);
const rdfRules: Record<string, string> = import.meta.glob(
  "/node_modules/eye-reasoning/rpo/rdfs-*.n3",
  {
    eager: true,
    query: "raw",
    import: "default",
  },
);

const ontology = (await getOntology("organization"))!;
await initOxigraph();
const result = await n3reasoner(
  [
    nQuads,
    ontology,
    ...Object.values(rdfRules),
    ...Object.values(owlRules),
    `
  @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
  @prefix schema: <http://schema.org/> .
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
  @prefix owl: <http://www.w3.org/2002/07/owl#> .

  skos:exactMatch rdfs:subPropertyOf owl:equivalentClass .
  schema:name rdfs:subPropertyOf rdfs:label .
  `,
  ],
  "{ ?s ?p ?o } => { ?s ?p ?o }.",
  {
    outputType: "quads",
  },
).catch((e) => {
  console.error("EYE Reasoning error:", e);
  throw e;
});

const store = new Store();
for (const q of result) {
  const toOxiTerm = (term: any) => {
    if (term.termType === "NamedNode") {
      return namedNode(term.value);
    }
    if (term.termType === "BlankNode") {
      return blankNode(term.value);
    }
    if (term.termType === "Literal") {
      return literal(
        term.value,
        term.language ||
          (term.datatype ? namedNode(term.datatype.value) : undefined),
      );
    }
    return namedNode(term.value);
  };

  try {
    store.add(
      quad(
        toOxiTerm(q.subject) as Quad_Subject,
        toOxiTerm(q.predicate) as Quad_Predicate,
        toOxiTerm(q.object),
        defaultGraph(),
      ),
    );
  } catch {}
}

const cleanResult = store.query(`
PREFIX uato: <https://uec-atlas.e-chan1007.workers.dev/ontology/>
PREFIX uatr: <https://uec-atlas.e-chan1007.workers.dev/resources/>
PREFIX owl: <http://www.w3.org/ns/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
  ?s ?p ?o .
}
WHERE {
  ?s ?p ?o .

  FILTER (
    STRSTARTS(STR(?s), "https://uec-atlas.e-chan1007.workers.dev/resources/") ||
    (isBlank(?s) && EXISTS {
      ?parent (!rdf:type|rdf:type)* ?s .
      FILTER(STRSTARTS(STR(?parent), "https://uec-atlas.e-chan1007.workers.dev/resources/"))
    })
  )

  FILTER(?p != owl:sameAs)
  FILTER(?p != rdfs:subClassOf)
  FILTER(?p != rdfs:subPropertyOf)
}
`);

const finalTurtle = new Store(cleanResult as any).dump({
  format: "nq",
});
export const allOrganizationsNQuads = finalTurtle;

export const GET: APIRoute = async () => {
  return new Response(allOrganizationsNQuads, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/n-quads; charset=utf-8",
    },
  });
};
