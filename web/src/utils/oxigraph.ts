import init, {
  BlankNode,
  blankNode,
  DefaultGraph,
  defaultGraph,
  Literal,
  literal,
  NamedNode,
  namedNode,
  Quad,
  type Quad_Predicate,
  type Quad_Subject,
  quad,
  Store,
  Variable,
} from "oxigraph/web";
import wasm from "oxigraph/web_bg.wasm";

let initialized = false;

export async function initOxigraph() {
  if (!initialized) {
    // biome-ignore lint/suspicious/noExplicitAny: Oxigraph expects a specific object format
    await init({ module_or_path: wasm as any });
    initialized = true;
  }
}

export {
  Store,
  namedNode,
  blankNode,
  literal,
  quad,
  defaultGraph,
  Variable,
  NamedNode,
  BlankNode,
  Literal,
  Quad,
  DefaultGraph,
  type Quad_Subject,
  type Quad_Predicate,
};
