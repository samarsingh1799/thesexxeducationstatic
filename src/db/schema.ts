import { appSchema } from "./app-schema";
import * as authSchema from "./auth-schema";

/**
 * Combined Drizzle schema for the single D1 database this app uses.
 * auth-schema.ts is generated (never hand-edited) by `npm run auth:schema`
 * from src/lib/auth/index.ts's better-auth config — re-run that script,
 * then `npm run db:generate` + apply the migration, whenever the auth
 * config changes (a new plugin, a new field, etc.).
 */
export const schema = {
  ...appSchema,
  ...authSchema,
} as const;
