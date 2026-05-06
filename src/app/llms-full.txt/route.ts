import { DOCS_MARKDOWN } from "@/lib/docs-markdown";

export const dynamic = "force-static";

export function GET() {
  return new Response(DOCS_MARKDOWN, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
