// Touch targets: every <summary> in the site is at least 44px high.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

test("every <summary> is a 44px touch target, its one line centred in it", () => {
  const files = fs.readdirSync(SRC, { recursive: true }).map(String).filter((f) => f.endsWith(".tsx"))
  let found = 0
  for (const f of files) {
    const code = fs.readFileSync(path.join(SRC, f), "utf8")
    for (const tag of code.split("<summary").slice(1)) {
      found++
      const className = tag.match(/^\s+className="([^"]*)"/)?.[1].split(" ") ?? []
      assert.ok(className.includes("min-h-[44px]"), `${f}: <summary> without min-h-[44px]`)
      assert.ok(className.includes("items-center"), `${f}: <summary> text not centred in the taller target`)
    }
  }
  assert.ok(found > 0, "no <summary> found: the scan is broken")
})
