import {
  buildCart,
  buildFilterSuggestionsGenerator,
  buildInstantProducts,
  buildStandaloneSearchBox,
  CommerceEngine,
} from "@coveo/headless/commerce";
import React from "react";
import ReactDOM from "react-dom";
import { ContextSelector } from "../components/context-selector/context-selector.js";
import CartTab from "../components/cart-tab/cart-tab.js";
import StandaloneSearchBox from "../components/standalone-search-box/standalone-search-box.js";
import { useConfig } from "../context/config-context.js";
import { highlightOptions } from "../utils/highlight-options.js";
import { getDisplayName } from "../utils/path-utils.js";
import "./layout.css";

export const FeatureToggleContext = React.createContext({
  showFacetSearch: false,
  useFiltersDeeplinking: false,
});

interface ILayoutProps {
  engine: CommerceEngine;
  isPending: boolean;
  navigate: (path: string) => void;
  children: React.ReactNode;
}

export default function Layout(props: ILayoutProps) {
  const { engine, isPending, navigate, children } = props;
  const standaloneSearchBoxId = "standalone-search-box";

  // Get the current site config and language from context
  const { currentSiteConfig, currentLanguage } = useConfig();

  // console.log("Current language:", currentLanguage);
  // console.log("Current site config:", currentSiteConfig);

  const navPaths = [...currentSiteConfig.navigationPaths].sort((a, b) =>
    getDisplayName(a).localeCompare(getDisplayName(b))
  );

  // Get baseURI from the site configuration
  const remoteBaseUrl = currentSiteConfig.baseURI;

  // Helper function to create the remote URL by removing "/listing" prefix
  const getRemoteUrl = (path: string) => {
    return `${remoteBaseUrl}${path.replace("/listing", "")}`;
  };

  const [inputValue, setInputValue] = React.useState("");
  const [showSettings, setShowSettings] = React.useState(false);
  const [showFacetSearch, setShowFacetSearch] = React.useState(false); // default: off
  const [useFiltersDeeplinking, setUseFiltersDeeplinking] = React.useState(
    currentSiteConfig.trackingId === "poc.acc.philips.ca"
  ); // default: off
  const currentPath = window.location.pathname;
  const currentNavPath = navPaths.includes(currentPath)
    ? currentPath
    : navPaths[0];

  React.useEffect(() => {
    if (currentPath !== currentNavPath) {
      console.log(`Navigating to: ${currentNavPath}`);
      navigate(currentNavPath);
    }
  }, [currentPath, currentNavPath, navigate]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPath = e.target.value;
    navigate(selectedPath);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check if the input matches a display name
    const matchedPath = navPaths.find((path) => getDisplayName(path) === value);
    if (matchedPath) {
      // If exact match found, navigate to that path
      navigate(matchedPath);
      // Clear the input after navigation
      //setInputValue("");
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Try to find the best match if user presses Enter
      if (filteredPaths.length > 0) {
        navigate(filteredPaths[0]);
        setInputValue("");
      }
    }
  };

  // Filter paths by their display names
  const filteredPaths = inputValue
    ? navPaths.filter((path) =>
        getDisplayName(path).toLowerCase().includes(inputValue.toLowerCase())
      )
    : navPaths;

  const settingsModal = showSettings
    ? ReactDOM.createPortal(
        <div className="HeaderSettingsModal">
          <div className="HeaderSettingsModalContent">
            <button
              className="HeaderSettingsModalClose"
              onClick={() => setShowSettings(false)}
            >
              Close
            </button>
            <h2 className="HeaderSettingsModalTitle">Settings</h2>
            <label className="HeaderSettingsModalLabel">
              <input
                type="checkbox"
                checked={showFacetSearch}
                onChange={(e) => setShowFacetSearch(e.target.checked)}
                className="HeaderSettingsModalCheckbox"
              />
              Show search in facets
            </label>
            <label className="HeaderSettingsModalLabel">
              <input
                type="checkbox"
                checked={useFiltersDeeplinking}
                onChange={(e) => setUseFiltersDeeplinking(e.target.checked)}
                className="HeaderSettingsModalCheckbox"
              />
              Use #filters deeplinking
            </label>
          </div>
        </div>,
        document.body
      )
    : null;

  // Memoize context value to avoid unnecessary re-renders
  const featureToggleValue = React.useMemo(
    () => ({
      showFacetSearch,
      useFiltersDeeplinking,
      setUseFiltersDeeplinking, // Expose setter
    }),
    [showFacetSearch, useFiltersDeeplinking]
  );

  return (
    <FeatureToggleContext.Provider value={featureToggleValue}>
      <div className="Layout">
        <section className="Header">
          <div className="AppTitleWrapper">
            <h1 className="AppTitle">PLP tester</h1>
            <ContextSelector />
            <button
              className="HeaderSettingsButton"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
          <div className="Navigation">
            <div className="NavigationWrapper">
              {/* Input with datalist commented out */}
              {/* ...existing code... */}
              <select
                value={currentPath}
                onChange={(e) => navigate(e.target.value)}
                style={{
                  width: "100%",
                }}
              >
                {navPaths.map((path, index) => (
                  <option key={index} value={path}>
                    {getDisplayName(path)}
                  </option>
                ))}
              </select>
              <a
                href={getRemoteUrl(currentPath)}
                target="_blank"
                rel="noopener noreferrer"
                className="Button HeaderRemoteButton"
                title={`Open in remote environment: ${getRemoteUrl(
                  currentPath
                )}`}
              >
                Remote{" "}
                <span style={{ marginLeft: "4px", fontSize: "18px" }}>➚</span>
              </a>
            </div>

            {/* <CartTab
            controller={buildCart(engine)}
            onChange={() => navigate('/cart')}
          ></CartTab> */}
          </div>
          {settingsModal}
          {/* ...existing code... */}
        </section>
        {/* Pass showFacetSearch to children via context or props as needed */}
        {!isPending && <main>{children}</main>}
      </div>
    </FeatureToggleContext.Provider>
  );
}
