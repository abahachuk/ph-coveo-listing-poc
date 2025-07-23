import { mapFilterKeyToFacet } from "./category-mapping.js";

// Helper function to extract filter keys from label|key format
export const extractKeyFromLabelKeyPair = (value: string): string => {
  const parts = value.split("|");
  return parts.length > 1 ? parts[1] : value; // Return just the key part
};

// Helper function to format display name from a key
export const formatDisplayName = (key: string): string => {
  // Remove prefixes like FK_ and suffixes like _SU
  let name = key.replace(/^FK_/, "").replace(/_SU$/, "");

  // Replace underscores with spaces and convert to title case
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Get facet mapping for a filter key - throws error if mapping fails
export const getFacetMapping = async (
  locale: string,
  categoryCode: string,
  key: string
): Promise<{ facetField: string; displayName: string }> => {
  try {
    const mapping = await mapFilterKeyToFacet(locale, categoryCode, key);
    console.log(
      `Mapped ${key} to ${mapping.facetField} with display name "${mapping.displayName}"`
    );
    return mapping;
  } catch (error) {
    console.error(`Error mapping filter key ${key}:`, error);
    throw new Error(`Failed to map filter key: ${key}`);
  }
};

// Function to convert simplified URL format to Coveo format (async)
export const convertSimplifiedToStandardFormat = async (
  simplifiedFragment: string,
  locale: string,
  categoryCode: string
): Promise<string> => {
  if (!simplifiedFragment) return "";
  if (!simplifiedFragment.includes("filters=")) return simplifiedFragment;

  console.log(
    "Converting simplified format to Coveo format:",
    simplifiedFragment
  );

  // Create URL params object to correctly handle encoded characters
  const urlParams = new URLSearchParams(simplifiedFragment);
  const filterParam = urlParams.get("filters");

  if (!filterParam) return simplifiedFragment;

  // Get all other params except 'filters'
  urlParams.delete("filters");
  const otherParams = urlParams.toString();

  // Get the filter keys and remove any empties
  const filterKeys = filterParam.split(",").filter((key) => key.trim());
  console.log("Filter keys to map:", filterKeys);

  if (filterKeys.length === 0) {
    return otherParams;
  }

  try {
    // Get mappings for all keys in parallel
    const mappingsPromises = filterKeys.map((key) =>
      getFacetMapping(locale, categoryCode, key)
    );
    const mappings = await Promise.all(mappingsPromises);

    // Group filter keys by facet field
    const facetGroups: Record<string, { displayName: string; key: string }[]> =
      {};

    mappings.forEach((mapping, index) => {
      const key = filterKeys[index];
      const { facetField, displayName } = mapping;

      if (!facetGroups[facetField]) {
        facetGroups[facetField] = [];
      }

      facetGroups[facetField].push({
        displayName: displayName || formatDisplayName(key),
        key,
      });
    });

    // Convert the grouped facets to URL parameters
    const standardFilters = Object.entries(facetGroups).map(
      ([facetField, values]) => {
        // Create comma-separated list of encoded "displayName|key" pairs
        const encodedValues = values
          .map((v) => encodeURIComponent(`${v.displayName}|${v.key}`))
          .join(",");
        return `${facetField}=${encodedValues}`;
      }
    );

    // Join all parts and return
    const result =
      standardFilters.join("&") + (otherParams ? `&${otherParams}` : "");
    console.log("Converted to standard format:", result);
    return result;
  } catch (error) {
    console.error("Error mapping filter keys:", error);
    throw new Error(`Failed to convert simplified format: ${error.message}`);
  }
};

// Function to convert Coveo format to simplified URL format
export const convertStandardToSimplifiedFormat = (
  standardFragment: string
): string => {
  if (!standardFragment) return "";

  console.log("Coveo format to convert:", standardFragment);

  // Split the fragment into parts (in case URL has special formatting)
  const parts = standardFragment.split("&");
  const filterKeys: string[] = [];
  const otherParams: string[] = [];

  // Process each part
  for (const part of parts) {
    // First, check if this part contains an equals sign to separate parameter name and value
    if (!part.includes("=")) {
      // If no equals sign, it's not a valid parameter
      if (part) otherParams.push(part);
      continue;
    }

    const [paramName, paramValue] = part.split("=");
    if (!paramValue) {
      // Empty value, keep as other param
      if (part) otherParams.push(part);
      continue;
    }

    // Check if this is a product-related facet parameter (both with and without f- prefix)
    const isFacetParam =
      // Standard facets with f- prefix
      paramName.startsWith("f-ps_product_") ||
      // Sometimes facets don't have the f- prefix
      paramName.startsWith("ps_product_") ||
      // Ensure we catch all possible variations
      paramName.includes("product_fg_");

    if (isFacetParam) {
      console.log("Processing facet parameter:", part);

      // Split by commas to handle multiple values for the same facet
      const values = decodeURIComponent(paramValue).split(",");

      for (const val of values) {
        // Extract the filter key part (after the | character)
        const keyPart = extractKeyFromLabelKeyPair(val);

        // Validate the key format
        if (keyPart.startsWith("FK_") || keyPart.endsWith("_SU")) {
          filterKeys.push(keyPart);
          console.log("Added filter key:", keyPart);
        } else {
          console.log("Skipping non-filter key:", keyPart);
        }
      }
    } else {
      // Keep other parameters as is
      if (part && !part.includes("filters=")) {
        otherParams.push(part);
      }
    }
  }

  // Build the new simplified URL format
  let result = "";

  // Add the consolidated filters parameter if we have any keys
  if (filterKeys.length > 0) {
    console.log("Consolidated filter keys:", filterKeys);
    // Remove duplicates if any
    const uniqueKeys = [...new Set(filterKeys)];
    result = `filters=${uniqueKeys.join(",")}`;
  }

  // Add other parameters if any
  if (otherParams.length > 0) {
    if (result) {
      result += "&";
    }
    result += otherParams.join("&");
  }

  console.log("Simplified format result:", result);
  return result;
};

// Extract subcategory from URL and format it for use in facets
export const extractSubcategoryFromUrl = async (
  useSimplifiedUrlFormat: boolean,
  subcatCode: string,
  locale: string
): Promise<string> => {
  //const subcategoryFacetParamId = "f-ps_product_fg_subcategory";
  const subcategoryFacetParamId = "f-ps_product_subcategory";
  const pathParts = window.location.pathname.split("/");
  // URL format: /listing/c-m-pe/electric-toothbrushes/6000-series/latest

  // For a subcategory URL, subcategory would be at index 4 (0-based)
  if (
    pathParts.length >= 5 &&
    pathParts[4] !== "all" &&
    pathParts[4] !== "latest" &&
    pathParts[4] !== "les-dernieres-nouveautes"
  ) {
    const subcategory = pathParts[4].replace(/-/g, " ");
    const subcategoryKey = subcatCode;
    let displayName = subcategory;

    console.log("extracted code", subcatCode);

    if (useSimplifiedUrlFormat) {
      return `filters=${subcategoryKey}`;
    } else {
      const { displayName } = await getFacetMapping(
        locale,
        subcategoryKey,
        subcategoryKey
      );

      return displayName
        ? `${subcategoryFacetParamId}=${encodeURIComponent(`${displayName}`)}`
        : "";
    }
  }

  return "";
};
