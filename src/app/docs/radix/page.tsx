import { VariantDocs } from "../variant-docs";

// The Radix variant. Base UI is the default at /docs; this route is the
// "one click away" alternative reachable from the toggle.
export default function RadixDocsPage() {
  return <VariantDocs variant="radix" />;
}
