/**
 * Presentational newsletter CTA. No email service is wired up yet, so the
 * form has real semantic markup (label, type="email", submit button)
 * ready to be connected to one, but no working `action` — left honest
 * rather than faking a working signup.
 */
export function Newsletter() {
  return (
    <section className="my-10 rounded-xl bg-ink px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold">Power up your inbox</h2>
        <p className="mt-2 text-white/80">Get the latest articles, delivered straight to your inbox.</p>
        <form className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            className="w-full rounded-md border border-white/40 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/60 sm:max-w-xs"
          />
          <button type="submit" className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-black">
            Sign up
          </button>
        </form>
      </div>
    </section>
  );
}
