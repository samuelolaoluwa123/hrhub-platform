// Shared by the clock-in/clock-out API routes. Extracting this here
// (rather than duplicating it in both routes) is what keeps the two
// routes' flagging logic consistent — same IP/device extraction, same
// "does this look like the company's office network" check either way.

// 6.2 — the client can't be trusted to self-report its own IP (that's
// trivial to fake and would defeat the entire point of "how do we
// know they worked remotely"). This reads it from the request itself,
// server-side, where Vercel's proxy sets it — the client never gets a
// say in what IP gets recorded.
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function getClientDevice(request) {
  return request.headers.get("user-agent") || "unknown";
}

// HRhub is a Nigeria-only product for now — hardcoding Africa/Lagos
// (WAT, no DST) rather than building general per-company timezone
// support is a deliberate, scoped-down choice, not an oversight.
const LAGOS_TZ = "Africa/Lagos";

export function lagosLocalParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    workDate: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

// Simple prefix match, not full CIDR math — deliberately lightweight
// for a v1 ("attendance_trusted_networks.ip_prefix" is just the start
// of an IP string, e.g. "102.89.23.").
export function ipMatchesAnyTrustedNetwork(ip, trustedNetworks) {
  if (!ip || ip === "unknown" || !trustedNetworks?.length) return false;
  return trustedNetworks.some((n) => ip.startsWith(n.ip_prefix));
}

// 6.2's "suspicious activity detection" signal, computed once so both
// routes flag consistently: a declared location that doesn't match
// what the network evidence suggests.
export function locationMismatchFlag(workLocation, ip, trustedNetworks) {
  if (!trustedNetworks?.length || ip === "unknown") return null;
  const onTrustedNetwork = ipMatchesAnyTrustedNetwork(ip, trustedNetworks);
  if (workLocation === "office" && !onTrustedNetwork) {
    return "Marked Office, but the network doesn't match a known office IP.";
  }
  if (workLocation === "remote" && onTrustedNetwork) {
    return "Marked Remote, but the network matches a known office IP.";
  }
  return null;
}
