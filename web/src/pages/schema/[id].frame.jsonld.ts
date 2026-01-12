import { toFullURL } from "@/utils/url";
import type { APIRoute } from "astro";

export const prerender = true;

const files = import.meta.glob("../../../../generated/*.frame.jsonld", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const getStaticPaths = async () => {
  return Object.keys(files).map((item) => ({
    params: { id: item.split("/").pop()?.replace(".frame.jsonld", "") },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  const file = Object.entries(files).find(([key, _value]) =>
    key.endsWith(`${id}.frame.jsonld`),
  );
  if (!file) {
    return new Response("Not Found", { status: 404 });
  }
  const frame = JSON.parse(file[1]);
  if (typeof frame["@context"] === "string") {
    frame["@context"] = toFullURL(`/schema/${frame["@context"]}`);
  } else if (Array.isArray(frame["@context"])) {
    frame["@context"] = frame["@context"].map((contextItem) => {
      if (typeof contextItem === "string") {
        return toFullURL(`/schema/${contextItem}`);
      }
      return contextItem;
    });
  }
  return new Response(JSON.stringify(frame), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/ld+json",
    },
  });
};
