import "server-only";

/**
 * The only place in the codebase that reads a provider API key.
 *
 * Decision E5 of docs/motor-extracao.md: the key lives in a server environment
 * variable and nowhere else — not in the database, not in a log, not in an API
 * response. What travels to the browser is a boolean saying whether the variable
 * exists, which is exactly what the model selector needs to light a provider up
 * or grey it out.
 *
 * `import "server-only"` makes that a build error rather than a promise: any
 * client component that imports this file, directly or through a chain, fails the
 * build instead of shipping a key to the browser.
 *
 * The variable name comes from ai_providers.env_var_name, so adding a provider
 * needs no change here.
 */

/** Which environment variables a provider may name. Uppercase, underscores. */
const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;

/**
 * Whether the key for this provider exists on the server. Never returns or logs
 * the value — only whether there is one.
 */
export function isProviderConfigured(envVarName: string): boolean {
  return readProviderKey(envVarName) !== null;
}

/**
 * The key itself, for the adapter that is about to make a call. Returns null when
 * unset so the caller reports "not configured" instead of sending an empty
 * credential and getting an opaque 401 from the provider.
 *
 * The name is validated before the lookup: it arrives from a database column, and
 * a shape check costs nothing next to reading an arbitrary environment variable.
 */
export function readProviderKey(envVarName: string): string | null {
  if (!ENV_VAR_PATTERN.test(envVarName)) return null;

  const value = process.env[envVarName];

  return value && value.trim() !== "" ? value : null;
}
