import React, { createContext, useContext, useState, useEffect } from "react";
import { SiteConfig, siteConfigs } from "../types/site-config.js";

// Storage keys and default values as constants to avoid duplication
export const LANGUAGE_STORAGE_KEY = "selectedLanguage";
export const TRACKING_ID_STORAGE_KEY = "selectedTrackingId";
export const DEFAULT_LANGUAGE = "en";
export const DEFAULT_TRACKING_ID = "acc.philips.ca";

// Standalone utility function to get site config without React context
export function getSiteConfigFromStorage(): SiteConfig {
  const currentLanguage =
    localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
  const trackingId =
    localStorage.getItem(TRACKING_ID_STORAGE_KEY) || DEFAULT_TRACKING_ID;

  // First try to find config with matching language and trackingId
  const configWithTrackingId = siteConfigs.find(
    (c) => c.language === currentLanguage && c.trackingId === trackingId
  );

  if (configWithTrackingId) {
    return configWithTrackingId;
  }

  // If not found, try to find any config with the same tracking ID
  const configWithTrackingIdOnly = siteConfigs.find(
    (c) => c.trackingId === trackingId
  );

  if (configWithTrackingIdOnly) {
    return configWithTrackingIdOnly;
  }

  // Fall back to a config with the same language
  const configWithLanguage = siteConfigs.find(
    (c) => c.language === currentLanguage
  );

  if (configWithLanguage) {
    return configWithLanguage;
  }

  // Last resort: just use the first config
  return siteConfigs[0];
}

// Define the languages for type safety
export type SupportedLanguage =
  | "en"
  | "fr"
  | "es"
  | "de"
  | "it"
  | "pt"
  | "ja"
  | "zh"
  | "ko";

interface ConfigContextType {
  currentSiteConfig: SiteConfig;
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  trackingId: string;
  setTrackingId: (id: string) => void;
}

export const ConfigContext = createContext<ConfigContextType | undefined>(
  undefined
);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  // Initialize language from localStorage or default
  const [currentLanguage, setCurrentLanguageState] =
    useState<SupportedLanguage>(
      () =>
        (localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage) ||
        DEFAULT_LANGUAGE
    );

  // Initialize trackingId from localStorage or use the default
  const [trackingId, setTrackingIdState] = useState<string>(
    () => localStorage.getItem(TRACKING_ID_STORAGE_KEY) || DEFAULT_TRACKING_ID
  );

  // Get the current site config based on language and trackingId
  const getSiteConfig = () => {
    // console.log(
    //   "Getting site config for language:",
    //   currentLanguage,
    //   "and tracking ID:",
    //   trackingId
    // );

    // Use our standalone utility with the current state values
    // First try to find config with matching language and trackingId
    const configWithTrackingId = siteConfigs.find(
      (c) => c.language === currentLanguage && c.trackingId === trackingId
    );

    //console.log("Config with tracking ID:", configWithTrackingId);

    if (configWithTrackingId) {
      return configWithTrackingId;
    }

    // If nothing found, fall back to the utility function
    return getSiteConfigFromStorage();
  };

  const currentSiteConfig = getSiteConfig();

  // Set language and update localStorage
  const setLanguage = (language: SupportedLanguage) => {
    setCurrentLanguageState(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    // We reload to apply the new language settings
    window.location.reload();
  };

  // Set tracking ID and update localStorage
  const setTrackingId = (id: string) => {
    setTrackingIdState(id);
    localStorage.setItem(TRACKING_ID_STORAGE_KEY, id);
    // We reload to apply the new tracking id settings
    window.location.reload();
  };

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    localStorage.setItem(TRACKING_ID_STORAGE_KEY, trackingId);
  }, [currentLanguage, trackingId]);

  return (
    <ConfigContext.Provider
      value={{
        currentSiteConfig,
        currentLanguage,
        setLanguage,
        trackingId,
        setTrackingId,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};
