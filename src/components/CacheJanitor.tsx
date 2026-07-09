"use client"

import { useEffect } from "react"
import { cachePurgeExpired } from "@/lib/cache"

export function CacheJanitor() {
  useEffect(() => {
    cachePurgeExpired()
  }, [])
  return null
}
