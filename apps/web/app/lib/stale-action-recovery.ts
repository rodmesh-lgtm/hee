const RELOAD_KEY = "infro:stale-action-reload";
const RELOAD_COOLDOWN_MS = 60_000;

export function isStaleServerAction(error: { name?: string; message?: string }) {
  return error.name === "UnrecognizedActionError"
    || /Failed to find Server Action/i.test(error.message ?? "")
    || /Server Action\s+["'][^"']+["']\s+was not found on the server/i.test(error.message ?? "");
}

/** A missing action was never executed. Refresh the document, never replay its POST. */
export function claimStaleActionReload(storage: Pick<Storage, "getItem" | "setItem">, now = Date.now()) {
  try {
    const previous = Number(storage.getItem(RELOAD_KEY));
    if (previous > 0 && now - previous < RELOAD_COOLDOWN_MS) return false;
    storage.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    // Blocked browser storage must not create an automatic reload loop.
    return false;
  }
}
