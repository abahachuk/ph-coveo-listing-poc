/**
 * Generates a user-friendly display name from a URL path
 *
 * @param path - The URL path to convert to a display name
 * @returns A formatted display name
 */
export const getDisplayName = (path: string): string => {
  if (path === "/") return "Home";
  if (path === "/search") return "Search";

  // For listing paths, format the path segments into a readable name
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "listing") {
    // Remove "c-m-pe" segment if it exists
    const relevantSegments = segments.filter(
      (s) => !s.startsWith("c-m") && s !== "listing"
    );
    // Format the segments with proper capitalization
    return relevantSegments
      .map((segment) => {
        // Replace hyphens with spaces and capitalize each word
        return segment
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      })
      .join(" - ");
  }

  // Default fallback - just use the path with slashes removed
  return path.replace(/\//g, " ").trim();
};
