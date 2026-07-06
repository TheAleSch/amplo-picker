import { VariantDocs } from "./variant-docs";

// Base UI is the default variant (like shadcn). The Radix variant lives at
// /docs/radix; the two are reachable via the toggle at the top of the page.
export default function DocsPage() {
  return <VariantDocs variant="base" />;
}
