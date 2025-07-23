import {
  Cart,
  ChildProduct,
  Search as HeadlessSearch,
  ProductListing,
} from "@coveo/headless/commerce";
import { useState, useEffect } from "react";
import BreadcrumbManager from "../../breadcrumb-manager/breadcrumb-manager.js";
import FacetGenerator from "../../facets/facet-generator/facet-generator.js";
import Pagination from "../../pagination/pagination.js";
import ProductList from "../../product-list/product-list.js";
import ProductsPerPage from "../../products-per-page/products-per-page.js";
//import ShowMore from '../../show-more/show-more.js';
import Sort from "../../sort/sort.js";
import Summary from "../../summary/summary.js";
import "./search-and-listing-interface.css";

interface ISearchAndListingInterface {
  searchOrListingController: HeadlessSearch | ProductListing;
  cartController: Cart;
  navigate: (pathName: string) => void;
}

export default function SearchAndListingInterface(
  props: ISearchAndListingInterface
) {
  const { searchOrListingController, cartController, navigate } = props;

  const [searchOrListingState, setSearchOrListingState] = useState(
    searchOrListingController.state
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    searchOrListingController.subscribe(() =>
      setSearchOrListingState(searchOrListingController.state)
    );
  }, [searchOrListingController]);

  const summaryController = searchOrListingController.summary();
  const paginationController = searchOrListingController.pagination();

  const toggleFilters = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <div className="SearchAndListingInterface">
      <div className="">
        <Sort controller={searchOrListingController.sort()} />
        <Summary controller={summaryController} />
      </div>
      <button
        type="button"
        aria-expanded={isFilterOpen}
        aria-controls="facet-panel"
        className={`MobileFilterToggle ${isFilterOpen ? "active" : ""}`}
        onClick={toggleFilters}
      >
        <span>{isFilterOpen ? "Hide Filters" : "Show Filters"}</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div
        id="facet-panel"
        className={`SearchAndListingInterfaceColumnFacets ${
          isFilterOpen ? "active" : ""
        }`}
      >
        <FacetGenerator
          controller={searchOrListingController.facetGenerator()}
        />
      </div>
      <div className="SearchAndListingInterfaceColumnResults">
        <BreadcrumbManager
          controller={searchOrListingController.breadcrumbManager()}
        />

        <ProductList
          products={searchOrListingState.products}
          controllerBuilder={searchOrListingController.interactiveProduct}
          cartController={cartController}
          promoteChildToParent={(child: ChildProduct) =>
            searchOrListingController.promoteChildToParent(child)
          }
          navigate={navigate}
        ></ProductList>
        <ProductsPerPage controller={paginationController} />
        {/* <ShowMore
          controller={paginationController}
          summaryController={summaryController}
        /> */}
        <Pagination controller={paginationController} />
      </div>
    </div>
  );
}
