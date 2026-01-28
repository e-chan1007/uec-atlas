import { n3reasoner } from "eyereasoner";
import type { PostalAddress } from "generated/organization";
import jsonld from "jsonld";
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

export const formatAddress = (address: PostalAddress, locale = "ja") => {
  if (!address) return "";
  const parts = [];
  if (locale === "ja") {
    if (address.postalCode) parts.push(`〒${address.postalCode} `);
    if (address.addressRegion) parts.push(address.addressRegion.ja);
    if (address.addressLocality) parts.push(address.addressLocality.ja);
    if (address.streetAddress) parts.push(address.streetAddress.ja);
    return parts.join("");
  } else {
    if (address.streetAddress) parts.push(address.streetAddress.en);
    if (address.addressLocality) parts.push(address.addressLocality.en);
    if (address.addressRegion) parts.push(address.addressRegion.en);
    if (address.postalCode) parts.push(address.postalCode);
    return parts.join(", ");
  }
};

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

export const jsonLdToNQuads = async (ontology: string, jsonLd: object) => {
  const nQuads = (await jsonld.toRDF(jsonLd, {
    format: "application/n-quads",
  })) as string;

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
    `
   @prefix log: <http://www.w3.org/2000/10/swap/log#> .
  {
    ?s ?p ?o .
    ?s log:uri ?sUri .
  } => {
    ?s ?p ?o
  }.`,
    {
      outputType: "quads",
    },
  ).catch((e) => {
    console.error("EYE Reasoning error:", e);
    throw e;
  });

  const store = new Store();
  for (const q of result) {
    // biome-ignore lint/suspicious/noExplicitAny: _
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
    PREFIX uatr: <https://uec-atlas.e-chan1007.workers.dev/resources/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    CONSTRUCT { ?s ?p ?o }
    WHERE {
      ?s ?p ?o .
      FILTER(?p NOT IN (owl:sameAs, rdfs:subClassOf, rdfs:subPropertyOf))

      FILTER (
        STRSTARTS(STR(?s), STR(uatr:)) ||
        (isBlank(?s) && EXISTS {
          ?root (!rdf:type|rdf:type)* ?s .
          FILTER(STRSTARTS(STR(?root), STR(uatr:)))
        })
      )
    }
  `);

  // biome-ignore lint/suspicious/noExplicitAny: _
  return new Store(cleanResult as any).dump({
    format: "nq",
  });
};
