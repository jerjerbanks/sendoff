import { env } from "cloudflare:workers";
import { APP_NAME, SIGN_IN_FROM } from "./constants";
import { signInEmailBody } from "./email-body";

/** What the Cloudflare Email Sending binding (send_email in wrangler.jsonc) takes. */
interface SendEmail {
  send(message: {
    to: string;
    from: { email: string; name: string };
    subject: string;
    text: string;
    html: string;
  }): Promise<{ messageId: string }>;
}

/**
 * Send a sign-in code. Never throws: a failure is logged (never the code or the address)
 * and reported as false. Without the EMAIL binding (local tests) nothing is sent.
 */
export async function sendSignInCode(to: string, code: string): Promise<boolean> {
  const binding = (env as unknown as { EMAIL?: SendEmail }).EMAIL;
  if (!binding || typeof binding.send !== "function") {
    console.warn(JSON.stringify({ event: "sign_in_email", outcome: "binding_missing" }));
    return false;
  }
  try {
    const { messageId } = await binding.send({ to, from: { email: SIGN_IN_FROM, name: APP_NAME }, ...signInEmailBody(code) });
    console.log(JSON.stringify({ event: "sign_in_email", outcome: "sent", messageId }));
    return true;
  } catch (error) {
    const failure = error as { code?: string; message?: string };
    console.error(JSON.stringify({ event: "sign_in_email", outcome: "failed", code: failure.code ?? null, message: String(failure.message ?? error).slice(0, 200) }));
    return false;
  }
}
