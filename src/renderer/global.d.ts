import type { AdhdWorkerApi } from "../preload/preload"

declare global {
  interface Window {
    adhdworker: AdhdWorkerApi
  }
}

export {}
