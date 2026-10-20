import { renderToString } from "react-dom/server";
import App from "./App";

export { renderHead } from "./seo/seo";
export { pageMetaFor, SITEMAP, PRERENDER_ONLY, NOT_FOUND_META, APP_SHELL_PREFIXES } from "./routes";

/** Render one route to HTML for the static build (scripts/prerender.mjs). */
export function render(path: string) {
  return renderToString(<App ssrPath={path} />);
}
