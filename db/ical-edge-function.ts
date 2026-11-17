// Gloups · flux agenda privé de la famille (iCal), lu par Google Agenda ou l'agenda de l'iPhone.
// Adresse : /functions/v1/ical/<jeton de 64 caractères>.ics
// Le jeton n'est jamais stocké en clair : la base ne garde que son empreinte SHA-256.

const KIND: Record<string, string> = { pediatre: "Pédiatre", sage_femme: "Sage-femme", vaccin: "Vaccin", pmi: "PMI", examen: "Examen", autre: "Rendez-vous" };
const SIDE: Record<string, string> = { left: "gauche", right: "droite", both: "les deux" };

function esc(s: string): string {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
// Lignes de 75 octets au plus (RFC 5545)
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "", size = 0, max = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > max) { out.push(cur); cur = ""; size = 0; max = 74; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}
function utc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
// Date et heure locales d'un instant dans un fuseau donné
function local(d: Date, tz: string) {
  const p: Record<string, number> = {};
  for (const x of new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d)) {
    if (x.type !== "literal") p[x.type] = Number(x.value);
  }
  return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute };
}
// Instant correspondant à une heure locale (gère l'heure d'été)
function fromLocal(y: number, m: number, d: number, h: number, min: number, tz: string): Date {
  let t = Date.UTC(y, m - 1, d, h, min);
  for (let i = 0; i < 2; i++) {
    const l = local(new Date(t), tz);
    const diff = Date.UTC(l.y, l.m - 1, l.d, l.h, l.min) - Date.UTC(y, m - 1, d, h, min);
    t -= diff;
  }
  return new Date(t);
}
function ymd(y: number, m: number, d: number): string {
  return String(y) + String(m).padStart(2, "0") + String(d).padStart(2, "0");
}
function dur(min: number): string {
  min = Math.round(min);
  if (min < 60) return min + " min";
  const h = Math.floor(min / 60), r = min % 60;
  return h + " h" + (r ? " " + String(r).padStart(2, "0") : "");
}
function label(e: any): string {
  const d = e.data || {};
  switch (e.type) {
    case "feed.breast": return "Tétée " + (SIDE[d.side] || "");
    case "feed.bottle": return "Biberon" + (d.ml != null ? " " + d.ml + " ml" : "");
    case "feed.pump": return "Tire-lait" + (d.ml != null ? " " + d.ml + " ml" : "");
    case "sleep": return "Sommeil";
    case "diaper": return "Couche · " + (d.pee && d.poo ? "pipi et selles" : d.poo ? "selles" : "pipi");
    case "cry": return "Pleurs";
    case "bath": return "Bain";
    case "note": return "Note · " + (d.text || "");
    default: return e.type;
  }
}

function build(data: any): string {
  const tz = data.tz || "Europe/Paris";
  const now = utc(new Date());
  const L: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gloups//Agenda famille//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc("Gloups · " + (data.family || "famille")), "X-WR-TIMEZONE:" + tz,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
  ];
  for (const a of data.appointments || []) {
    const s = new Date(a.starts_at), e = a.ends_at ? new Date(a.ends_at) : new Date(s.getTime() + 30 * 60000);
    const title = (a.title || KIND[a.kind] || "Rendez-vous") + (a.child ? " · " + a.child : "");
    L.push("BEGIN:VEVENT", "UID:rdv-" + a.id + "@gloups", "DTSTAMP:" + utc(new Date(a.updated_at || Date.now())),
      "DTSTART:" + utc(s), "DTEND:" + utc(e), "SUMMARY:" + esc(title), "CATEGORIES:" + esc(KIND[a.kind] || "Rendez-vous"));
    if (a.location) L.push("LOCATION:" + esc(a.location));
    if (a.notes) L.push("DESCRIPTION:" + esc(a.notes));
    for (const r of a.reminders || []) {
      L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(title));
      if (r === "1h") L.push("TRIGGER:-PT1H");
      else if (r === "15min") L.push("TRIGGER:-PT15M");
      else if (r === "veille") { const l = local(s, tz); const prev = new Date(Date.UTC(l.y, l.m - 1, l.d) - 86400000); L.push("TRIGGER;VALUE=DATE-TIME:" + utc(fromLocal(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), 18, 0, tz))); }
      L.push("END:VALARM");
    }
    L.push("END:VEVENT");
  }
  const opts = data.options || {};
  const events: any[] = data.events || [];
  if (opts.summary) {
    // Un événement « journée entière » par jour et par enfant
    const days: Record<string, any> = {};
    for (const e of events) {
      const l = local(new Date(e.started_at), tz), k = ymd(l.y, l.m, l.d) + "|" + (e.child || "");
      const day = days[k] || (days[k] = { y: l.y, m: l.m, d: l.d, child: e.child, feeds: 0, wet: 0, poo: 0, sleep: 0, cry: 0 });
      if (e.type === "feed.breast" || e.type === "feed.bottle") day.feeds++;
      if (e.type === "diaper") { if (e.data?.pee) day.wet++; if (e.data?.poo) day.poo++; }
      if (e.type === "sleep" && e.ended_at) day.sleep += (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 60000;
      if (e.type === "cry" && e.ended_at) day.cry += (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 60000;
    }
    for (const k of Object.keys(days)) {
      const x = days[k], next = new Date(Date.UTC(x.y, x.m - 1, x.d) + 86400000);
      const parts = [x.feeds + " repas", x.wet + " couches mouillées", x.poo + " selles", dur(x.sleep) + " de sommeil"];
      if (x.cry >= 1) parts.push(dur(x.cry) + " de pleurs");
      L.push("BEGIN:VEVENT", "UID:jour-" + k.replace(/[^0-9A-Za-z]/g, "") + "@gloups", "DTSTAMP:" + now,
        "DTSTART;VALUE=DATE:" + ymd(x.y, x.m, x.d), "DTEND;VALUE=DATE:" + ymd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()),
        "SUMMARY:" + esc((x.child ? x.child + " · " : "") + parts.slice(0, 2).join(", ")), "DESCRIPTION:" + esc(parts.join("\n")), "TRANSP:TRANSPARENT", "END:VEVENT");
    }
  }
  if (opts.events) {
    for (const e of events) {
      const s = new Date(e.started_at);
      const end = e.ended_at ? new Date(e.ended_at) : null;
      const en = end && end.getTime() > s.getTime() ? end : new Date(s.getTime() + 5 * 60000);
      L.push("BEGIN:VEVENT", "UID:saisie-" + e.id + "@gloups", "DTSTAMP:" + utc(new Date(e.updated_at || Date.now())),
        "DTSTART:" + utc(s), "DTEND:" + utc(en), "SUMMARY:" + esc(label(e) + (e.child ? " · " + e.child : "")), "TRANSP:TRANSPARENT", "END:VEVENT");
    }
  }
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Méthode non autorisée", { status: 405 });
  const m = new URL(req.url).pathname.match(/([0-9a-f]{64})(?:\.ics)?$/);
  if (!m) return new Response("Introuvable", { status: 404 });
  // Clé serveur : nouvelle clé secrète (en-tête apikey seul), sinon l'ancienne clé service_role
  let secret = "";
  try { secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? ""; } catch (_e) { secret = ""; }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers.apikey = secret; else { headers.apikey = legacy; headers.Authorization = "Bearer " + legacy; }
  const r = await fetch(Deno.env.get("SUPABASE_URL") + "/rest/v1/rpc/api_v1_calendar_feed_data", {
    method: "POST",
    headers,
    body: JSON.stringify({ p_token: m[1] }),
  });
  if (!r.ok) return new Response("Indisponible", { status: 503 });
  const data = await r.json();
  if (!data) return new Response("Introuvable", { status: 404 });
  return new Response(req.method === "HEAD" ? null : build(data), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="gloups.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
});

// Exporté pour les tests locaux
export { build };
