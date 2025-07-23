import { buildCommerceEngine, CommerceEngine } from "@coveo/headless/commerce";
import { loadCartItemsFromLocalStorage } from "../utils/cart-utils.js";
import {
  getSiteConfigFromStorage,
  LANGUAGE_STORAGE_KEY,
  TRACKING_ID_STORAGE_KEY,
} from "./config-context.js";

declare global {
  interface ImportMeta {
    env: {
      VITE_ORGANIZATION_ID: string;
      VITE_ACCESS_TOKEN: string;
      // ...other env vars
    };
  }
}

export const getEngine = () => {
  if (_engine !== null) {
    return _engine;
  }

  // Get site config using our utility function
  const config = getSiteConfigFromStorage();
  // Vite exposes env variables via import.meta.env
  const organizationId = import.meta.env.VITE_ORGANIZATION_ID;
  const accessToken = import.meta.env.VITE_ACCESS_TOKEN;
  //console.log("ROUTER: Using site config:", config);

  _engine = buildCommerceEngine({
    configuration: {
      organizationId,
      accessToken,
      analytics: {
        trackingId: config.trackingId,
      },
      context: {
        currency: config.currency as any, // Cast to any to avoid type errors
        country: config.country,
        language: config.language,
        view: {
          url: `${config.baseURI}/${config.navigationPaths[0]}`,
        },
      },
    },
  });

  return _engine;
};

let _engine: CommerceEngine | null = null;
