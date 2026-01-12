import type { APIRoute } from "astro";

export const prerender = true;

const files = import.meta.glob("../../../../generated/*.context.jsonld", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const getStaticPaths = async () => {
  return Object.keys(files).map((item) => ({
    params: { id: item.split("/").pop()?.replace(".context.jsonld", "") },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  const file = Object.entries(files).find(([key, _value]) =>
    key.endsWith(`${id}.context.jsonld`),
  );
  if (!file) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(JSON.stringify(JSON.parse(file[1])), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/ld+json",
    },
  });
};
