/**
 * Transactional email — deliberately NOT wired to a real provider yet
 * (no email service was part of this project's initial scope). Every
 * call site in this app goes through these two functions, so plugging in
 * a real provider later (Resend, Postmark, SES, etc.) is a one-file
 * change, not a hunt through the codebase.
 *
 * In development (and until a provider is configured), the email is
 * logged instead of sent — the link still works, it's just delivered to
 * your terminal rather than an inbox, so registration/reset flows are
 * fully testable without any external account.
 */

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // TODO: replace with a real provider, e.g.:
  //   const resend = new Resend(env.RESEND_API_KEY);
  //   await resend.emails.send({ from: "...", to, subject, html: body });
  console.log(`[email:dev] To: ${to}\nSubject: ${subject}\n${body}\n`);
}

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  await sendEmail(to, "Verify your email", `Confirm your email address: ${url}`);
}

export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  await sendEmail(to, "Reset your password", `Reset your password: ${url}\n\nIf you didn't request this, ignore this email.`);
}
