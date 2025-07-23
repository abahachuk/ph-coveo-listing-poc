import React, { useEffect } from "react";
import { useConfig } from "../../context/config-context.js";
import { siteConfigs } from "../../types/site-config.js";

export const ContextSelector = () => {
  const { currentLanguage, setLanguage, trackingId, setTrackingId } =
    useConfig();

  // Get all unique tracking IDs
  const trackingIds = [...new Set(siteConfigs.map((cfg) => cfg.trackingId))];

  // Get languages that match the selected tracking ID
  const languagesForTracking = siteConfigs
    .filter((cfg) => cfg.trackingId === trackingId)
    .map((cfg) => cfg.language);

  console.log("Current languagesForTracking:", languagesForTracking);

  useEffect(() => {
    // Only change language if current one is not valid for selected trackingId
    const currentIsValid = languagesForTracking.includes(currentLanguage);
    if (!currentIsValid && languagesForTracking.length > 0) {
      setLanguage(languagesForTracking[0] as any);
    }
  }, [trackingId, currentLanguage, setLanguage, languagesForTracking]);

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setLanguage(event.target.value as any);
  };

  const handleTrackingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTrackingId(e.target.value);
  };

  return (
    <div className="ContextSelector">
      <select
        className="TrackingIdSelector"
        value={trackingId}
        onChange={handleTrackingChange}
        title="Tracking ID"
      >
        {trackingIds.map((id, idx) => (
          <option key={idx} value={id}>
            {id}
          </option>
        ))}
      </select>
      <select
        className="LangSelector"
        value={currentLanguage}
        onChange={handleLanguageChange}
        title="Language"
      >
        {languagesForTracking.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </div>
  );
};
