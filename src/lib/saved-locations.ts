export const MAX_SAVED_LOCATIONS = 3;
export const SAVED_LOCATION_LIMIT_MESSAGE = "3 is the max for saved locations.";

export function hasReachedSavedLocationLimit(count: number) {
  return count >= MAX_SAVED_LOCATIONS;
}
