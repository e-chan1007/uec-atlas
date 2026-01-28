import type { PostalAddress } from "generated/organization";

export const formatLangString = (
  value: string | { ja?: string; en?: string } | undefined,
  locale: "ja" | "en" | null | undefined = "ja",
  fallback = "",
): string => {
  const preferredLocale = locale ?? "ja";
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (locale) return value[locale] ?? fallback;
  return preferredLocale === "ja"
    ? (value.ja ?? value.en ?? fallback)
    : (value.en ?? value.ja ?? fallback);
};

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
