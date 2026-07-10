import { FullDocs } from "./full-docs";

// Base UI is the main variant and the docs default; the Radix variant is
// one click away at /docs/radix via the toggle.
export default function DocsPage() {
  return <FullDocs variant="base" />;
}
