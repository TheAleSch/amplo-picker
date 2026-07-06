import { redirect } from "next/navigation";

// The Base UI variant is now the default at /docs. Keep this route as a
// permanent redirect so existing links to /docs/base still resolve.
export default function BaseDocsRedirect() {
  redirect("/docs");
}
