import type { Config } from "drizzle-kit";

/**
 * `drizzle-kit generate` only ever produces SQL diff files here — it
 * never touches a live database (no `dbCredentials`/driver needed for
 * that). Applying them is Wrangler's job (`npm run db:migrate:local` /
 * `db:migrate:remote`), which is why `out` points straight at the
 * `migrations/` folder Wrangler's D1 tooling looks for by default,
 * rather than Drizzle's usual `./drizzle` — one migrations folder, one
 * tool applying them, instead of two systems disagreeing about state.
 */
export default {
  // Drizzle-kit's introspection needs the actual named table exports, not
  // schema.ts's re-exported `schema` object — so it points at the two
  // source files directly rather than the combined module.
  schema: ["./src/db/app-schema.ts", "./src/db/auth-schema.ts"],
  out: "./migrations",
  dialect: "sqlite",
} satisfies Config;
