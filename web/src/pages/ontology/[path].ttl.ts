import type { APIRoute } from "astro";

export const prerender = true;

const ontologyFiles = import.meta.glob("../../../../generated/*.ttl", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const getStaticPaths = async () => {
  return Object.keys(ontologyFiles).map((item) => ({
    params: { path: item.split("/").pop()?.replace(".ttl", "") },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;
  const file = Object.entries(ontologyFiles).find(([key, _value]) =>
    key.endsWith(`${path}.ttl`),
  );
  if (!file) {
    return new Response("Not Found", { status: 404 });
  }
  const response: Response = new Response(file[1], {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/turtle; charset=utf-8",
    },
  });
  return response;
};
