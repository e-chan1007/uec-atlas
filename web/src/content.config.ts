import { defineCollection, z } from "astro:content";
import type { Organization } from "../generated/organization";

const organizations = defineCollection({
  loader: () => {
    const files = import.meta.glob("../../data/organizations/*.json", {
      eager: true,
      import: "default",
    }) as Record<string, Organization>;

    return Object.values(files);
  },
  schema: z.custom<Organization>(),
});

export const collections = {
  organizations,
};
