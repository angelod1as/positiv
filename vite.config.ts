import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { varlockVitePlugin } from "@varlock/vite-integration"
import { defineConfig } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"
import tsconfigPaths from "vite-tsconfig-paths"

/**
 * Packages no route reachable from the entry graph imports, so the dev server's
 * dependency scan does not find them at boot. It finds them when the route that
 * imports one is first opened, and re-optimizing forces the page to reload —
 * mid-form, mid-quiz, whenever that first visit happens. Naming them here has
 * them pre-bundled at startup instead.
 *
 * Only development pays this: a production build bundles everything up front.
 *
 * When a page starts reloading itself on its first visit, run the dev server
 * against an empty `node_modules/.vite`, walk the app, and add whatever it
 * reports as `new dependencies optimized` to this list.
 */
const lazilyReachedDeps = [
  "@ag-grid-community/locale",
  "@hookform/resolvers/zod",
  "@marsidev/react-turnstile",
  "@radix-ui/react-dialog",
  "@radix-ui/react-separator",
  "ag-grid-community",
  "ag-grid-react",
  "date-fns/addDays",
  "date-fns/format",
  "date-fns/setHours",
  "date-fns/setMinutes",
  "react-hook-form",
  "recharts",
]

export default defineConfig({
  plugins: [
    varlockVitePlugin(),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    devtoolsJson(),
  ],
  optimizeDeps: { include: lazilyReachedDeps },
})
