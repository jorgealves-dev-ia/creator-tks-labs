import { NextResponse } from "next/server";

import { runCanvasGeneration } from "@/lib/generation/canvas-generate";

/**
 * One image for one generating block — the endpoint the canvas calls.
 *
 * It is a route rather than a Server Action for exactly one reason, spelled out
 * in lib/generation/canvas-contract.ts: Server Actions are dispatched through
 * React's rendering lifecycle and run one at a time, so "quantidade 4" through
 * an action would be four thirty-second waits in a queue. Four fetches are four
 * requests, which is what the stepper promises and what four separate clicks
 * would have done anyway.
 *
 * The security posture is the one a Server Action had, because it is the same
 * posture: this is a public HTTP endpoint either way. The session is read from
 * the cookie inside runCanvasGeneration, the body is parsed by its Zod schema,
 * every read is scoped by RLS, and the price comes from the catalogue through
 * record_generation. Nothing here is trusted because it arrived.
 *
 * No webhook secret, deliberately: this is a user calling their own studio with
 * their own session, not a provider calling us back. The endpoints under
 * app/api/webhooks are the ones that have nobody's cookie to check.
 */

/**
 * Above the adapter's own 50s ceiling, so a slow generation fails as our clear
 * error rather than as the platform killing the request mid-flight. A 4K image
 * is the reason this is not left at the default.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const result = await runCanvasGeneration(body);

  // Always 200 for an answered request, including a refusal: "não deu, e o
  // motivo é este" is a result the block knows how to draw, and dressing it as
  // an HTTP failure would make fetch's own error path and the provider's
  // refusal indistinguishable on the other side.
  return NextResponse.json(result);
}
