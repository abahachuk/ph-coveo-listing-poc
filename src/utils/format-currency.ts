import { getSiteConfigFromStorage } from "../context/config-context.js";

export function formatCurrency(
  price: number,
  language?: string,
  currency?: string
) {
  if (!language || !currency) {
    // If language or currency not provided, get them from site config
    const siteConfig = getSiteConfigFromStorage();
    language = language || siteConfig.language;
    currency = currency || siteConfig.currency;
  }

  return new Intl.NumberFormat(`${language}-${language}`, {
    style: "currency",
    currency: currency,
  }).format(price);
}
