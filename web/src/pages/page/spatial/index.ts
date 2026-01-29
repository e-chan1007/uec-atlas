import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ redirect }) =>
  redirect(`/page/spatial/all`, 303);
