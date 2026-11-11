// The rules of docs/architecture/decisions/20261106-server-side-code-is-organized-by-domain.md.
// scripts/check-dependencies.ts runs them inside `pnpm lint`, together with
// the check for cycles between business domains, which dependency-cruiser
// cannot express as a rule.

// Tests mock the database and stub vendor clients, so the rules about where
// infrastructure is reached do not apply to them. Cycles and the direction of
// dependencies do.
const TEST = "(\\.(test|spec)\\.tsx?$)|(^app/test/)"

// pnpm resolves a package to node_modules/.pnpm/<id>/node_modules/<name>/.
const npm = (name) => `(^|/)node_modules/${name}/`

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "no-circular",
      comment:
        "A runtime import cycle between modules. Cycles that pass through a type-only or dynamic import are erased or deferred, so they do not count.",
      severity: "error",
      from: {},
      to: {
        circular: true,
        viaOnly: { dependencyTypesNot: ["type-only", "dynamic-import"] },
      },
    },
    {
      name: "lib-not-to-business",
      comment:
        "app/lib is shared infrastructure with no domain knowledge, so it never imports app/business, not even a type.",
      severity: "error",
      from: { path: "^app/lib/" },
      to: { path: "^app/business/" },
    },
    {
      name: "pages-not-to-database",
      comment:
        "Route modules call app/business; they never import Kysely, pg, db.server or the Supabase server client.",
      severity: "error",
      from: { path: "^app/pages/", pathNot: TEST },
      to: {
        path: [
          npm("kysely"),
          npm("pg"),
          "^app/lib/supabase/db\\.server\\.ts$",
          "^app/lib/supabase/server\\.ts$",
        ],
      },
    },
    {
      name: "nodemailer-only-in-email",
      comment: "nodemailer belongs to business/email; other code calls it.",
      severity: "error",
      from: { pathNot: ["^app/business/email/", TEST] },
      to: { path: npm("nodemailer") },
    },
    {
      name: "sanity-only-in-cms",
      comment:
        "Sanity belongs to business/cms. Components are exempt: the visual-editing overlay runs in the browser.",
      severity: "error",
      from: { pathNot: ["^app/business/cms/", "^app/components/", TEST] },
      to: { path: npm("@sanity") },
    },
    {
      name: "asaas-only-in-payment",
      comment: "The Asaas connector belongs to business/payment.",
      severity: "error",
      from: { pathNot: ["^app/business/payment/", TEST] },
      to: { path: "^app/business/payment/provider/asaas/" },
    },
    {
      name: "listmonk-only-in-newsletter",
      comment: "The Listmonk client belongs to business/newsletter.",
      severity: "error",
      from: { pathNot: ["^app/business/newsletter/", TEST] },
      to: { path: "^app/business/newsletter/listmonk-client\\.server\\.ts$" },
    },
    {
      name: "settings-imports-no-domain",
      comment:
        "business/settings stores the app-wide flags; the domains read them, never the other way round. Type-only imports count too.",
      severity: "error",
      from: { path: "^app/business/settings/" },
      to: { path: "^app/business/(?!settings/)" },
    },
    {
      name: "pg-only-in-lib-supabase",
      comment: "The database driver is reached only through lib/supabase.",
      severity: "error",
      from: { pathNot: ["^app/lib/supabase/", TEST] },
      to: { path: npm("pg") },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs"],
    },
  },
}
