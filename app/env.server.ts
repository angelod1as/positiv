import { makeTypedEnvironment } from "./lib/helpers/make-typed-environment"
import { zod } from "./lib/helpers/zod"

// This function will parse the environment variables and return a strongly
// typed object with camelCased keys
const getEnvironment = makeTypedEnvironment(
  zod.object({
    // No need to set, it will be automatically set
    NODE_ENV: zod
      .enum(["development", "production", "test"])
      .default("development"),
    CI: zod.string().optional(),

    TEST_USER_ADMIN_EMAIL: zod.string().optional(),
    TEST_USER_PASSWORD: zod.string().optional(),

    SUPABASE_ACCESS_TOKEN: zod.string().optional(),
    VITE_SUPABASE_URL: zod.string().optional(),
    VITE_SUPABASE_ANON_KEY: zod.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod.string().optional(),
    SUPABASE_PROJECT_ID: zod.string().optional(),
    SUPABASE_DB_PASSWORD: zod.string().optional(),
    DATABASE_URL: zod.string().optional(),

    // unused:
    CONTENTFUL_ENVIRONMENT: zod.string().optional(),
    CONTENTFUL_SPACE_ID: zod.string().optional(),
    CONTENTFUL_ACCESS_TOKEN: zod.string().optional(),
    CONTENTFUL_PREVIEW_ACCESS_TOKEN: zod.string().optional(),
    CONTENTFUL_MANAGEMENT_TOKEN: zod.string().optional(),
    CONTENTFUL_REVALIDATE_SECRET: zod.string().optional(),
    CONTENTFUL_PREVIEW_SECRET: zod.string().optional(),

    FROM_EMAIL: zod.string().optional(),
    AWS_ACCESS_KEY_ID: zod.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod.string().optional(),
  }),
)

const env = () => getEnvironment(process.env)

export { env }
