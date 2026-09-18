import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
  title: "ADHDWorker — Arbeitszeit dokumentieren",
  description: "Fokussierter Arbeitszeit-Tracker mit Telegram und Clockify-Export.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className="antialiased font-sans"
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
