import parseAst from "json-to-ast";
import {
  ContextParser,
  type JsonLdContext,
  type JsonLdContextNormalized,
} from "jsonld-context-parser";
import type { ShikiTransformer } from "shiki";
import { getContext } from "@/pages/schema/[id].context.jsonld";
import { compactUri, expandURI } from "@/utils/url";
import { initOxigraph, namedNode, Store } from "./oxigraph";

type PropertyInfo = { key: string; uri: string; line: number };

const JSON_LD_KEYWORDS = ["@context", "@id", "@type"];

const descriptionCache = new Map<string, Record<string, string>>();
async function loadDescriptions(ttl: string) {
  const cached = descriptionCache.get(ttl);
  if (cached) return cached;

  await initOxigraph();
  const store = new Store();
  store.load(ttl, { format: "text/turtle" });

  const descriptions: Record<string, string> = {};
  for (const q of store.match(
    null,
    namedNode("http://www.w3.org/2004/02/skos/core#definition"),
    null,
  )) {
    descriptions[q.subject.value] = q.object.value;
  }

  descriptionCache.set(ttl, descriptions);
  return descriptions;
}

const simplifyAst = (node: parseAst.ValueNode): unknown => {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "Array":
      return (node.children ?? []).map(simplifyAst);
    case "Object":
      return Object.fromEntries(
        (node.children ?? []).map((p) => [p.key.value, simplifyAst(p.value)]),
      );
    default:
      return null;
  }
};

async function analyzeProperties(jsonSource: string) {
  const parser = new ContextParser({
    documentLoader: {
      async load(url) {
        try {
          const u = new URL(url);
          const id = u.pathname
            .split("/")
            .pop()
            ?.replace(".context.jsonld", "");
          const context = await getContext(id);
          if (context) {
            return { "@context": context };
          }
        } catch {
          // ignore
        }

        const res = await fetch(url, {
          headers: {
            Accept: "application/ld+json, application/json",
          },
        });
        if (!res.ok) {
          throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        }
        return {
          document: await res.json(),
          url,
        };
      },
    },
  });
  const propertiesByLine = new Map<number, PropertyInfo[]>();

  const traverse = async (
    node: parseAst.ValueNode,
    activeContext: JsonLdContextNormalized,
  ) => {
    if (node.type === "Array") {
      for (const child of node.children ?? []) {
        await traverse(child, activeContext);
      }
      return;
    }
    if (node.type === "Object") {
      let context = activeContext;
      const contextProp = node.children?.find(
        (p) => p.key.value === "@context",
      );

      if (contextProp) {
        context = await parser.parse(
          simplifyAst(contextProp.value) as JsonLdContext,
          {
            parentContext: activeContext,
          },
        );
      }

      for (const prop of node.children ?? []) {
        const key = prop.key.value;
        if (JSON_LD_KEYWORDS.includes(key)) continue;

        const line = prop.key.loc?.start.line ?? 0;
        const info = {
          key,
          uri: context.expandTerm(key, true) ?? "",
          line,
        };

        const list = propertiesByLine.get(line) ?? [];
        list.push(info);
        propertiesByLine.set(line, list);

        await traverse(prop.value, context);
      }
    }
  };

  try {
    const ast = parseAst(jsonSource);
    await traverse(ast, await parser.parse({}));
  } catch (e) {
    console.warn("Failed to parse JSON for JSON-LD highlighting", e);
  }
  return propertiesByLine;
}

async function createJsonLdHoverTransformer(
  jsonSource: string,
  ontologyTtl: string,
): Promise<ShikiTransformer> {
  const [descriptions, propsByLine] = await Promise.all([
    loadDescriptions(ontologyTtl),
    analyzeProperties(jsonSource),
  ]);

  return {
    name: "jsonld-hover",
    preprocess(_code, options) {
      options.includeExplanation = "scopeName";
    },
    span(node, line, _col, _lineText, token) {
      if (
        token.explanation?.some((e) =>
          e.scopes.some(
            (s) => s.scopeName === "support.type.property-name.json",
          ),
        )
      ) {
        const matched = propsByLine
          .get(line)
          ?.find((p) => token.content.trim() === JSON.stringify(p.key));

        if (matched) {
          const desc = descriptions[matched.uri];
          node.properties["data-tip"] =
            compactUri(matched.uri) + (desc ? `\n\n${desc}` : "");
          node.properties.class =
            `${node.properties.class || ""} jsonld-hover-target d-tooltip`.trim();
        }
      }
    },
  };
}

const autoLinkTransformer: ShikiTransformer = {
  name: "safe-link-transformer",
  span(node, _line, _col, _lineText, token) {
    if (
      token.content.length >= 2 &&
      token.content.startsWith('"') &&
      token.content.endsWith('"')
    ) {
      try {
        const innerContent = JSON.parse(token.content);
        if (typeof innerContent !== "string") return;

        const href = expandURI(innerContent);
        if (href !== innerContent || href.startsWith("http")) {
          node.tagName = "a";
          node.properties.href = href;
          node.properties.class = innerContent.startsWith("uatr:")
            ? "underline decoration-dashed hover:decoration-solid"
            : "hover:underline";
        }
      } catch {
        // JSON parse error ignore
      }
    }
  },
};

/**
 * 全てのJSON-LD用Transformerを取得する
 */
export async function getJsonLdTransformers(
  jsonSource: string,
  ontologyTtl: string,
): Promise<ShikiTransformer[]> {
  return [
    await createJsonLdHoverTransformer(jsonSource, ontologyTtl),
    autoLinkTransformer,
  ];
}
