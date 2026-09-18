import Link from "next/link"

type AppShellProps = {
  children: React.ReactNode
  backToDashboard?: boolean
  pageTitle?: string
}

export function AppShell({ children, backToDashboard = false, pageTitle }: AppShellProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-5 sm:px-8 sm:py-8">
        <header className="flex min-h-10 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">ADHDWorker</Link>
            {pageTitle ? <><span className="text-muted-foreground/40" aria-hidden="true">/</span><h1 className="truncate text-sm font-medium text-muted-foreground">{pageTitle}</h1></> : null}
          </div>
          {backToDashboard ? (
            <Link className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href="/">← Dashboard</Link>
          ) : (
            <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Hauptnavigation">
              <Link className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground" href="/history">Verlauf</Link>
              <Link className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground" href="/settings">Einstellungen</Link>
            </nav>
          )}
        </header>
        {children}
      </div>
    </main>
  )
}
