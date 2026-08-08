/**
 * The @handle typed in prompts. Shared by the browser (instant feedback while
 * typing) and the server (the real check), so it lives outside the actions file:
 * a "use server" module may only export async functions.
 *
 * The pattern mirrors the entities_handle_format constraint in
 * 20260807140200_assets_and_entities.sql. The database is the authority; this is
 * the same rule stated early enough to be helpful.
 */

export const HANDLE_MAX_LENGTH = 48;
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,47}$/;

/**
 * The combining marks that NFD splits an accented letter into. Built from a
 * string so the source file stays plain ASCII — the characters themselves are
 * invisible in an editor, which makes them easy to break by accident.
 */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

/**
 * Turns a display name into a usable handle: "Júlia Andrade" becomes
 * "julia-andrade". Accents are stripped rather than dropped, so "Ana Sofía"
 * keeps its letters instead of losing them.
 */
export function slugifyHandle(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HANDLE_MAX_LENGTH)
    // Slicing can leave a trailing separator behind.
    .replace(/-+$/g, "");

  // The constraint requires the first character to be a letter or a digit.
  return /^[a-z0-9]/.test(slug) ? slug : "";
}
