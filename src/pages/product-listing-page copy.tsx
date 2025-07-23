import {
  buildProductListing,
  Cart,
  CommerceEngine,
  Context,
  loadRegularFacetActions,
} from "@coveo/headless/commerce";
import { useCallback } from "react";
import { useEffect } from "react";
import SearchAndListingInterface from "../components/use-cases/search-and-listing-interface/search-and-listing-interface.js";

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

  console.log(engine);

  const productListingController = buildProductListing(engine);

  const bindUrlManager = useCallback(() => {
    const subcategoryFacetParamId = "f-ps_product_fg_subcategory";
    const fragment = () => window.location.hash.slice(1);
    const extractSubcategoryFromUrl = () => {
      const pathParts = window.location.pathname.split("/");
      // URL format: /listing/c-m-pe/electric-toothbrushes/6000-series/latest
      // We want the subcategory if it exists

      // For a subcategory URL, subcategory would be at index 4 (0-based)
      // Check if we have enough segments and that we're not at the 'latest' part
      if (pathParts.length >= 5 && pathParts[4] !== "latest") {
        const subcategory = pathParts[4].replace(/-/g, " ");
        return `${subcategoryFacetParamId}=${encodeURIComponent(subcategory)}`;
      }

      return "";
    };

    const initialState = (() => {
      const fragmentState = fragment();
      const subcategoryFromUrl = extractSubcategoryFromUrl();

      // If no fragment and no subcategory from URL, return empty
      if (!fragmentState && !subcategoryFromUrl) {
        return "";
      }

      // If we only have subcategory from URL, return it directly
      if (!fragmentState) {
        return subcategoryFromUrl;
      }

      // Handle the fragment string directly
      // If subcategory exists in URL path
      if (subcategoryFromUrl) {
        // Check if fragment already contains the subcategory filter
        const subcategoryKey = `${subcategoryFacetParamId}=`;
        const subcategoryFromPath = subcategoryFromUrl.substring(
          subcategoryKey.length
        );

        if (fragmentState.includes(subcategoryKey)) {
          // Extract existing subcategory values from fragment
          const regexPattern = new RegExp(`${subcategoryKey}([^&]+)`);
          const match = fragmentState.match(regexPattern);
          const existingValues = match ? match[1].split(",") : [];

          // Add the value from URL path if not already present
          // Don't decode again, as the values are already properly encoded
          const urlValues = subcategoryFromPath.split(",");

          // Merge values without duplicates - use consistent encoding
          const allValues = [...existingValues];
          for (const val of urlValues) {
            // Check if the value isn't already in the array to prevent duplicates
            if (!allValues.includes(val)) {
              allValues.push(val);
            }
          }

          // Replace the subcategory parameter in fragment
          const newFragment = fragmentState.replace(
            regexPattern,
            `${subcategoryKey}${allValues.join(",")}`
          );

          //console.log("Updated fragment with subcategory:", newFragment);

          return newFragment;
        } else {
          // Add subcategory to fragment if it doesn't exist
          return fragmentState
            ? `${fragmentState}&${subcategoryFromUrl}`
            : subcategoryFromUrl;
        }
      }

      return fragmentState;
    })();

    // console.log("Initial state for URL manager:", initialState);
    // console.log("url state:", fragment());

    const urlManager = productListingController.urlManager({
      initialState: { fragment: initialState },
      excludeDefaultParameters: true,
    });

    const onHashChange = () => {
      urlManager.synchronize(fragment());
    };

    window.addEventListener("hashchange", onHashChange);

    const unsubscribeManager = urlManager.subscribe(() => {
      const hash = `#${urlManager.state.fragment}`;

      if (!productListingController.state.responseId) {
        window.history.replaceState(null, document.title, hash);
        return;
      }

      window.history.pushState(null, document.title, hash);
    });

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      unsubscribeManager();
    };
  }, [productListingController]);

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
    contextController.setView({ url });
    const unsubscribe = bindUrlManager();

    // Select the "6000 series" value in the "ps_product_subcategory" facet
    // Using facet action creators instead of controller

    if (
      !productListingController.state.isLoading &&
      !productListingController.state.responseId
    ) {
      productListingController.executeFirstRequest();
    } else if (!productListingController.state.isLoading) {
      productListingController.refresh();
    }

    return unsubscribe;
  }, [contextController, url, productListingController, bindUrlManager]);

  return (
    <div className="ProductListingPage">
      <h2 className="PageTitle">{pageName}</h2>
      <SearchAndListingInterface
        searchOrListingController={productListingController}
        cartController={cartController}
        navigate={navigate}
      />
    </div>
  );
}
