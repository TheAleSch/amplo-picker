import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link
            href="/docs"
            className="transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            href="/playground"
            className="transition-colors hover:text-foreground"
          >
            Playground
          </Link>
          <a
            href="https://github.com/TheAleSch/amplo-picker"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
        <p>
          © {new Date().getFullYear()} Alexandre Schrammel ·{" "}
          <a
            href="https://github.com/TheAleSch/amplo-picker/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            MIT License
          </a>
        </p>
      </div>
    </footer>
  );
}
