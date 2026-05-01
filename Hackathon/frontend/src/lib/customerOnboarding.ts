/** Per-user completion flag so the customer welcome guide runs once unless replayed from Profile. */
const STORAGE_PREFIX = "localyse_customer_guide_v1_";

export function customerGuideStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function hasCompletedCustomerGuide(userId: string): boolean {
  if (!userId) return true;
  try {
    return localStorage.getItem(customerGuideStorageKey(userId)) === "done";
  } catch {
    return true;
  }
}

export function completeCustomerGuide(userId: string) {
  if (!userId) return;
  try {
    localStorage.setItem(customerGuideStorageKey(userId), "done");
  } catch {
    /* ignore quota / privacy mode */
  }
}

/** Clears completion so the next visit to `/app` can show the guide again (e.g. Profile “Replay”). */
export function resetCustomerTour(userId: string) {
  if (!userId) return;
  try {
    localStorage.removeItem(customerGuideStorageKey(userId));
  } catch {
    /* ignore */
  }
}
