import { defineCollection, z } from "astro:content";
import type { Organization } from "../generated/organization";

const organizations = defineCollection({
  loader: () => {
    const files = import.meta.glob("../../data/organizations/*.json", {
      eager: true,
      import: "default",
    }) as Record<string, Organization>;

    return Object.values(files)
      .toSorted((a, b) => {
        if(!a.name?.ja) return -1;
        if(!b.name?.ja) return 1;
        return a.name.ja.localeCompare(b.name.ja)
      });
  },
  schema: z.custom<Organization>(),
});

export const collections = {
  organizations,
};
