// /.well-known/security.txt (RFC 9116). Pure — tested with `node --test`,
// written into out/ after each build by scripts/security-txt.mjs.
//
// Generated at build time rather than kept as a static file: RFC 9116
// requires an Expires date and a file past it is to be treated as stale. A
// hand-written date would run out silently; this one moves with every build
// (the site rebuilds each weekday).
//
// Contact is the repository's issue tracker. No e-mail address is published
// here: the site owner decides whether to add one.

export const SECURITY_CONTACT = "https://github.com/mangdasire1/currencyversus/issues"
export const SECURITY_CANONICAL = "https://currencyversus.com/.well-known/security.txt"
// RFC 9116 recommends an Expires value less than a year ahead.
export const SECURITY_EXPIRES_DAYS = 180

export function securityTxt(now: Date): string {
  const expires = new Date(now.getTime() + SECURITY_EXPIRES_DAYS * 86_400_000)
  expires.setUTCHours(0, 0, 0, 0)
  return [
    `Contact: ${SECURITY_CONTACT}`,
    `Expires: ${expires.toISOString().replace(".000Z", "Z")}`,
    "Preferred-Languages: en, tr",
    `Canonical: ${SECURITY_CANONICAL}`,
    "",
  ].join("\n")
}
