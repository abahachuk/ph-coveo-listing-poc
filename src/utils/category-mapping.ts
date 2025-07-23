/**
 * Utility functions for fetching category and filter mapping information
 */

// No need to import LanguageContext as we'll pass locale as parameter

interface CategoryEntry {
  code: string;
  seoName: string;
  displayName: string;
}

interface FilterKey {
  id: string;
  displayName: string;
  code: string;
}

interface FilterGroup {
  id: string;
  name: string;
  filterKeys: FilterKey[];
}

interface CategoryFilters {
  filterGroups: FilterGroup[];
}

/**
 * Cache for taxonomy and filter data to avoid redundant API calls
 */
const cache: {
  taxonomy: Record<string, CategoryEntry[]>;
  filters: Record<string, CategoryFilters>;
} = {
  taxonomy: {},
  filters: {},
};

/**
 * Fetch the taxonomy for a specific locale
 */
export const fetchTaxonomy = async (
  locale: string
): Promise<CategoryEntry[]> => {
  if (cache.taxonomy[locale]) {
    return cache.taxonomy[locale];
  }

  try {
    // Ensure locale format is like "en_GB" with underscore
    const formattedLocale = locale.replace(
      /[_-]([a-z]{2})$/i,
      (_, country) => `_${country.toUpperCase()}`
    );
    const response = await fetch(
      `https://www.philips.com/prx/category/B2C/${formattedLocale}/CONSUMER.taxonomy`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch taxonomy: ${response.status}`);
    }

    const rawData = await response.json();
    // Handle both possible data structures: direct array or object with data property
    const data = rawData.data || rawData;

    // Ensure we have an array of CategoryEntry objects
    const entries = Array.isArray(data) ? data : [];
    cache.taxonomy[locale] = entries;
    return entries;
  } catch (error) {
    console.error("Error fetching taxonomy:", error);
    return [];
  }
};

/**
 * Fetch the filters for a specific locale and category code
 */
export const fetchFilters = async (
  locale: string,
  categoryCode: string
): Promise<CategoryFilters> => {
  const cacheKey = `${locale}_${categoryCode}`;

  if (cache.filters[cacheKey]) {
    return cache.filters[cacheKey];
  }

  try {
    const formattedLocale = locale.replace(
      /[_-]([a-z]{2})$/i,
      (_, country) => `_${country.toUpperCase()}`
    );
    const response = await fetch(
      `https://www.philips.com/prx/category/B2C/${formattedLocale}/CONSUMER/${categoryCode}.filters`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch filters: ${response.status}`);
    }

    const data = await response.json();
    cache.filters[cacheKey] = data;
    return data;
  } catch (error) {
    console.error("Error fetching filters:", error);
    return { filterGroups: [] };
  }
};

/**
 * Find a category code based on the SEO name (from URL)
 */
export const findCategoryCode = async (
  locale: string,
  seoName: string
): Promise<string | null> => {
  const taxonomy = await fetchTaxonomy(locale);

  // Determine if we're looking for a category or subcategory
  const segments = seoName.split("/");
  const isSubcategory = segments.length > 1;

  // If it's a simple category lookup
  if (!isSubcategory) {
    // Find the category by seoName
    const category = taxonomy.find(
      (entry) =>
        entry.seoName?.toLowerCase() === seoName.toLowerCase() &&
        entry.type === "category"
    );

    return category ? category.code : null;
  }

  // If it's a subcategory, we need to find parent first, then the subcategory
  const [parentSeoName, childSeoName] = segments;

  // First find the parent category
  const parentCategory = taxonomy.find(
    (entry) =>
      entry.seoName?.toLowerCase() === parentSeoName.toLowerCase() &&
      entry.type === "category"
  );

  if (!parentCategory) return null;

  // Then find the subcategory that has this parent as its parent code
  const subcategory = taxonomy.find(
    (entry) =>
      entry.seoName?.toLowerCase() === childSeoName.toLowerCase() &&
      entry.parentCode === parentCategory.code &&
      entry.type === "subcategory"
  );

  return subcategory ? subcategory.code : null;
};

/**
 * Cache for filter key mappings
 */
const filterKeyCache: Record<string, { groupId: string; displayName: string }> =
  {};

/**
 * Find the filter group ID for a specific filter key
 * This function caches results to avoid redundant API calls
 */
export const findFilterGroupForKey = async (
  locale: string,
  categoryCode: string,
  filterKey: string
): Promise<{ groupId: string; displayName: string } | null> => {
  // Check cache first for performance optimization
  const cacheKey = `${locale}_${categoryCode}_${filterKey}`;
  if (filterKeyCache[cacheKey]) {
    return filterKeyCache[cacheKey];
  }

  // Special handling for subcategory filter keys (ending with _SU)
  if (filterKey.endsWith("_SU")) {
    try {
      // Extract category code from the filterKey by removing _SU
      const subCategoryCode = filterKey;

      // Get the taxonomy data to find the category display name
      const taxonomy = await fetchTaxonomy(locale);

      // Find the subcategory by code (case-insensitive)
      const subCategory = taxonomy.find(
        (entry) => entry.code.toLowerCase() === subCategoryCode.toLowerCase()
      );

      if (subCategory) {
        console.log(subCategory);
        const result = {
          groupId: "fg_subcategory",
          displayName: subCategory.displayName,
        };

        // Cache the result
        filterKeyCache[cacheKey] = result;
        console.log(
          `Found subcategory for ${filterKey}: ${subCategory.displayName}`
        );
        return result;
      }
    } catch (error) {
      console.error(`Error finding subcategory for ${filterKey}:`, error);
    }
  }

  try {
    if (categoryCode.endsWith("_SU")) {
      // If categoryCode ends with _SU, we can skip fetching filters
      const subCategoryCode = categoryCode;
      const taxonomy = await fetchTaxonomy(locale);
      const subCategory = taxonomy.find(
        (entry) => entry.code.toLowerCase() === subCategoryCode.toLowerCase()
      );
      if (subCategory.parentCode) {
        categoryCode = subCategory.parentCode;
        console.log(
          `Subcategory ${subCategoryCode} found with parent code: ${categoryCode}`
        );
      }
    }

    const filters = await fetchFilters(locale, categoryCode);

    // Search through filter groups to find the key
    for (const group of filters.data) {
      const matchingKey = group.filterKeys.find(
        (key) => key.code === filterKey || key.id === filterKey
      );

      if (matchingKey) {
        const result = {
          groupId: group.id,
          displayName: matchingKey.displayName,
        };

        // Cache the result to avoid redundant API calls
        filterKeyCache[cacheKey] = result;
        console.log(
          `Cached mapping for ${filterKey}: ${group.id} (${matchingKey.displayName})`
        );
        return result;
      }
    }

    console.warn(`No filter group found for key: ${filterKey}`);
    return null;
  } catch (error) {
    console.error(`Error finding filter group for key ${filterKey}:`, error);
    return null;
  }
};

/**
 * Map a filter key to a facet field and display name with caching
 */
export const mapFilterKeyToFacet = async (
  locale: string,
  categoryCode: string,
  filterKey: string
): Promise<{ facetField: string; displayName: string }> => {
  // Check cache first for performance optimization
  const cacheKey = `${locale}_${categoryCode}_${filterKey}`;
  if (filterKeyCache[cacheKey]) {
    const { groupId, displayName } = filterKeyCache[cacheKey];
    return {
      facetField: `f-ps_product_${groupId.toLowerCase()}`,
      displayName,
    };
  }

  // Get filter group info - this will handle subcategory keys internally
  const filterInfo = await findFilterGroupForKey(
    locale,
    categoryCode,
    filterKey
  );

  if (filterInfo) {
    // Create the facet field using the group ID - for subcategories, groupId is "fg_subcategory"
    return {
      facetField: `f-ps_product_${filterInfo.groupId.toLowerCase()}`,
      displayName: filterInfo.displayName,
    };
  }

  // If no matching filter found, return a default facet field
  console.error(`No filter found for key: ${filterKey}`);

  return {};
};

/**
 * Extract SEO name from URL path
 * URL format: /c-m-pe/electric-toothbrushes/latest
 * or: /c-m-pe/electric-toothbrushes/6000-series/latest
 * or: /fr/c-m-ho/accessoires-aspirateurs-vadrouilles/accessoires-et-filtres-pour-aspirateurs/les-dernieres-nouveautes
 */
export const extractSeoNameFromPath = (path: string): string => {
  // Get the portion of the path starting from the c-m- pattern
  // Remove the c-m-* part and everything before it
  const cmFolderMatch = path.match(/\/c-m-[^/]+\//i);
  if (!cmFolderMatch) {
    console.warn(`Unable to find c-m-* pattern in path: ${path}`);
    return "";
  }
  const relevantPath = path.substring(
    cmFolderMatch.index + cmFolderMatch[0].length
  );
  const parts = relevantPath.split("/").slice(0, -1).join("/");

  return parts;
};

/**
/**
 * Helper function to get the category code for the given path and locale
 */
export const getCategoryCode = async (
  path: string,
  locale: string
): Promise<string | null> => {
  const { seoName } = extractSeoNameFromPath(path);
  if (!seoName) return null;

  return await findCategoryCode(locale, seoName);
};
