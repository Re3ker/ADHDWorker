import * as React from "react"

function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => { document.documentElement.classList.add("dark") }, [])
  return <>{children}</>
}

export { ThemeProvider }
