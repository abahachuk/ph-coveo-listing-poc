import {
  buildProductListing,
  Cart,
  CommerceEngine,
  Context,
  loadRegularFacetActions,
} from "@coveo/headless/commerce";
import React, { useCallback, useEffect, useState } from "react";
import { useConfig } from "../context/config-context.js";
import {
  extractSeoNameFromPath,
  findCategoryCode,
} from "../utils/category-mapping.js";
import {
  convertSimplifiedToStandardFormat,
  convertStandardToSimplifiedFormat,
  extractSubcategoryFromUrl,
  getFacetMapping,
} from "../utils/url-conversion-helpers.js";
import SearchAndListingInterface from "../components/use-cases/search-and-listing-interface/search-and-listing-interface.js";
import "./product-listing-page.css";
import { FeatureToggleContext } from "../layout/layout.js";

interface IProductListingPageProps {
  engine: CommerceEngine;
  cartController: Cart;
  contextController: Context;
  url: string;
  pageName: string;
  navigate: (pathName: string) => void;
}

export default function ProductListingPage(props: IProductListingPageProps) {
  const { engine, cartController, contextController, url, pageName, navigate } =
    props;

  // Get feature toggles from context
  // This will reflect the 'Use #filters deeplinking' toggle from layout
  const featureToggles = React.useContext(FeatureToggleContext);
  const { useFiltersDeeplinking, setUseFiltersDeeplinking } = featureToggles;

  console.log("Feature toggles in PLP:", featureToggles);

  // Get current language for API calls
  const { currentSiteConfig } = useConfig();
  const locale =
    currentSiteConfig.language.toLowerCase() +
    "-" +
    currentSiteConfig.country.toUpperCase();

  // State for category code
  const [categoryCode, setCategoryCode] = useState<string | null>(null);

  // Category code is now loaded in the main useEffect below

  // const regularFacetActions = loadRegularFacetActions(engine);
  // if (regularFacetActions) {
  //   const action = regularFacetActions.toggleSelectFacetValue({
  //     facetId: 'ps_product_subcategory',
  //     selection: {
  //       value: '6000 series',
  //       state: 'selected',
  //       numberOfResults: 1,
  //     },
  //   });
  //   engine.dispatch(action);
  // }

  const extendedConfig = {
    ...engine,
  };

  //console.log(engine, extendedConfig);

  // Set preloaded state if needed - commented out due to typing issues
  /*
  // @ts-ignore - Type issue with preloadedState
  engine.preloadedState = {
    facetSet: {
      ps_product_subcategory: {
        request: {
          filterFacetCount: true,
          injectionDepth: 1000,
          numberOfValues: 3,
          sortCriteria: "automatic",
          resultsMustMatch: "atLeastOneValue",
          type: "specific",
          currentValues: [
            {
              value: "6000 series",
              state: "selected",
            },
          ],
          freezeCurrentValues: false,
          isFieldExpanded: false,
          preventAutoSelect: false,
          field: "ps_product_subcategory",
          facetId: "ps_product_subcategory",
          tabs: {},
          activeTab: "Any",
        },
        hasBreadcrumbs: true,
      },
    },
  };
  */

  console.log(engine);

  const productListingController = buildProductListing(engine);

  const bindUrlManager = useCallback(async () => {
    // Ensure we have a category code before proceeding with filter mappings
    if (!categoryCode) {
      throw new Error(
        "Category code not loaded yet. Cannot proceed with filter mappings."
      );
    }

    console.log(`Using category code for filter mappings: ${categoryCode}`);

    //const subcategoryFacetParamId = "f-ps_product_fg_subcategory";

    // Get the hash fragment without the leading #
    const getFragment = () => window.location.hash.slice(1);

    // Toggle for using the simplified URL format (filters=key1,key2) vs the default format (f-field=value)

    const useSimplifiedUrlFormat = useFiltersDeeplinking;
    //console.log(useSimplifiedUrlFormat);

    // Using helper functions from url-conversion-helpers.js

    // Get the initial state based on URL and mappings
    const getInitialState = async (): Promise<string> => {
      let fragmentState = getFragment();

      console.log("Fragment state before processing:", fragmentState);

      // Override fragment state based on active subcategory as default
      if (!fragmentState) {
        fragmentState = await extractSubcategoryFromUrl(
          useSimplifiedUrlFormat,
          categoryCode,
          locale
        );
      }

      console.log(
        "Fragment state after subcategory extraction:",
        fragmentState
      );

      // If using simplified format, convert to standard Coveo format
      let standardFragment = fragmentState;
      if (useSimplifiedUrlFormat) {
        standardFragment = await convertSimplifiedToStandardFormat(
          fragmentState,
          locale,
          categoryCode
        );
        return standardFragment;
      }

      // If no fragment and no subcategory, return empty
      if (!standardFragment) {
        return "";
      }

      return standardFragment;
    };

    // Create and initialize the URL manager
    const createUrlManager = async () => {
      try {
        // Get the initial state with mappings properly loaded
        const initialState = await getInitialState();
        console.log("Using initial state:", initialState);

        // Create URL manager with the properly mapped state
        console.log("Creating URL manager with initial state:", initialState);
        const manager = productListingController.urlManager({
          initialState: { fragment: initialState },
          excludeDefaultParameters: true,
        });

        // Subscribe to URL manager changes to update the URL when facets change through UI
        const unsubscribe = manager.subscribe(() => {
          // Get the fragment from the URL manager (this is always in standard format)
          const hash = manager.state.fragment;

          console.log("URL manager fragment state:", hash);

          // Only convert if we have a hash and simplified format is enabled
          let formattedHash = hash;

          if (useSimplifiedUrlFormat && hash) {
            try {
              // Check if the hash contains product parameters that need conversion
              const containsProductParams = hash.includes("ps_product_");

              if (containsProductParams) {
                // Convert to simplified format
                formattedHash = convertStandardToSimplifiedFormat(hash);
                console.log("Converted to simplified format:", formattedHash);
              }
            } catch (error) {
              console.error("Error converting to simplified format:", error);
              // Fall back to the original hash
              formattedHash = hash;
            }
          }

          // Update the URL with the appropriate format (replaceState for initial load, pushState for interactions)
          const updateMethod = !productListingController.state.responseId
            ? "replaceState"
            : "pushState";
          window.history[updateMethod](
            null,
            document.title,
            formattedHash ? `#${formattedHash}` : window.location.pathname
          );
        });

        return unsubscribe;
      } catch (error) {
        console.error("Failed to create URL manager:", error);
        throw error; // Re-throw to let caller handle it
      }
    };

    // Return the cleanup function
    return await createUrlManager();
  }, [productListingController, categoryCode, locale]);

  useEffect(() => {
    /**
     * It is important to call the `Context` controller's `setView` method with the current URL when a page is loaded,
     * as the Commerce API requires this information to function properly.
     *
     * Note, however, that calling this method will reset the query, pagination, sort, and facets.
     *
     * This means that on a search or listing page, you must call this method BEFORE you bind the URL manager.
     * Otherwise, the URL manager will restore the state from the URL parameters, and then this state will get
     * immediately reset when the `setView` method is called.
     */
    contextController.setView({ url }); // Initialize the product listing after category code and mappings are loaded
    const initializeProductListing = async () => {
      try {
        // Call bindUrlManager which handles all URL mapping and initialization
        const unsubscribe = await bindUrlManager();

        // Execute the search request after URL manager is set up
        if (!productListingController.state.isLoading) {
          if (!productListingController.state.responseId) {
            productListingController.executeFirstRequest();
          } else {
            productListingController.refresh();
          }
        }

        return unsubscribe;
      } catch (error) {
        console.error("Error in initializeProductListing:", error);
        throw error; // Re-throw the error to handle it at the top level
      }
    };

    // We no longer need a separate function to load initial mappings -
    // getFacetMapping will handle this directly when called from convertSimplifiedToStandardFormat

    // Keep track of cleanup function
    const cleanupRef = { current: undefined as (() => void) | undefined };

    // Main initialization function
    const initialize = async () => {
      try {
        // Load category code if not already available
        if (categoryCode === null) {
          // Extract path from URL
          const urlObj = new URL(url);
          const path = urlObj.pathname;
          const seoName = extractSeoNameFromPath(path);
          if (!seoName) {
            throw new Error("Could not extract SEO name from URL");
          }
          console.log(`Extracted SEO name: ${seoName}`);
          const code = await findCategoryCode(locale, seoName);
          if (!code) {
            throw new Error(
              `Could not find category code for SEO name: ${seoName}`
            );
          }

          setCategoryCode(code);
          console.log(`Loaded category code: ${code} for SEO name: ${seoName}`);
          // The effect will re-run with the new categoryCode
          return;
        }

        // Initialize product listing with category code
        const unsubscribe = await initializeProductListing();
        cleanupRef.current = unsubscribe;
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };

    // Start initialization
    initialize();

    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [
    contextController,
    url,
    productListingController,
    bindUrlManager,
    categoryCode,
    locale,
  ]);

  return (
    <div className="ProductListingPage">
      {/* <h2 className="PageTitle">{pageName}</h2> */}
      <SearchAndListingInterface
        searchOrListingController={productListingController}
        cartController={cartController}
        navigate={navigate}
      />
    </div>
  );
}
