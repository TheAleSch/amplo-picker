import { redirect } from "next/navigation";

// The Base UI docs moved to /docs (the default). Keep the old URL working.
export default function BaseDocsRedirect() {
  redirect("/docs");
}
