import { APP_NAME } from "./constants";
import { CODE_MINUTES } from "./sign-in-code";

/** The sign-in code email: code in the subject (shows in notifications), plain text and simple HTML. */
export function signInEmailBody(code: string): { subject: string; text: string; html: string } {
  const subject = `${code} is your ${APP_NAME} sign-in code`;
  const text = [
    `Your ${APP_NAME} sign-in code is ${code}.`,
    "",
    `Type it on the page where you asked for it. It works once and expires in ${CODE_MINUTES} minutes.`,
    "",
    "If you didn't ask for this, ignore this email. Nobody can sign in without the code.",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1a17;background:#f7f3ee">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b4532a;font-weight:600">${APP_NAME}</p>
<p style="margin:0 0 16px;font-size:16px">Your sign-in code:</p>
<p style="margin:0 0 16px;font-size:36px;font-weight:700;letter-spacing:.2em;font-family:ui-monospace,Menlo,monospace">${code}</p>
<p style="margin:0 0 8px;font-size:14px;color:#5c554d">Type it on the page where you asked for it. It works once and expires in ${CODE_MINUTES} minutes.</p>
<p style="margin:0;font-size:14px;color:#5c554d">If you didn't ask for this, ignore this email. Nobody can sign in without the code.</p>
</body></html>`;
  return { subject, text, html };
}
