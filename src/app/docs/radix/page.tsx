import { FullDocs } from "../full-docs";

// The Radix / shadcn-classic variant. Base UI is the default at /docs; this
// route is the "one click away" alternative reachable from the toggle.
export default function RadixDocsPage() {
  return <FullDocs variant="radix" />;
}
