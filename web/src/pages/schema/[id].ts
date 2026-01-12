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

export const GET: APIRoute = async ({ params, redirect }) => {
  const { id } = params;
  const response = redirect(`/schema/${id}.context.jsonld`, 303);
  response.headers.set("Vary", "Accept");
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
};
