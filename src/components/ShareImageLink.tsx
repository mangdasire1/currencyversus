import { Download } from "lucide-react"

export interface ShareImageDownload {
  href: string // "/usd-vs-try/share.png", the page's own share image (built once, B6)
  fileName: string // shareDownloadName(), e.g. "usd-vs-try-2026-11-21.png"
}

// Downloads the page's existing share image; nothing new is drawn. A plain
// <a download>, not next/link: this is a file, not a page.
// Currency pages: the image holds the 10-year line → "chart image".
// Metal pages: it holds the price, with no chart → "price image".
export function ShareImageLink({ image, kind }: { image: ShareImageDownload; kind: "chart" | "price" }) {
  return (
    <a
      href={image.href}
      download={image.fileName}
      className="group self-start inline-flex items-center gap-2 min-h-[44px] text-sm text-slate-300 hover:text-white"
    >
      <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="underline underline-offset-4">{kind === "chart" ? "Download chart image" : "Download price image"}</span>{" "}
      <span className="text-slate-400">{kind === "chart" ? "(10 years, PNG)" : "(PNG)"}</span>
    </a>
  )
}
