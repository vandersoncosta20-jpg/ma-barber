import { BARBERS, HOUSE, SERVICES } from "../js/data.js"

const KINDS = new Set(["critica", "opiniao", "elogio"])

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  })
}

function digits(phone) {
  return String(phone || "").replace(/\D/g, "")
}

function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ")
}

function serviceById(id) {
  return SERVICES.find((item) => item.id === id) || null
}

function barberById(id) {
  return BARBERS.find((item) => item.id === id) || null
}

function timeToMin(time) {
  const [h, m] = String(time).split(":").map(Number)
  return h * 60 + m
}

function minToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function blockedMinutes(serviceId) {
  const service = serviceById(serviceId)
  const real = service ? service.minutes : HOUSE.slot
  return Math.ceil(real / HOUSE.slot) * HOUSE.slot
}

function overlap(aStart, aBlock, bStart, bBlock) {
  return aStart < bStart + bBlock && bStart < aStart + aBlock
}

function bahiaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value || ""
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  }
}

function todayISO() {
  const parts = bahiaParts()
  return `${parts.year}-${parts.month}-${parts.day}`
}

function weekday(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return -1
  return new Date(Date.UTC(y, m - 1, d, 15, 0, 0)).getUTCDay()
}

function validDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return false
  const [y, m, d] = iso.split("-").map(Number)
  const check = new Date(Date.UTC(y, m - 1, d))
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${date.getUTCFullYear()}-${month}-${day}`
}

function openDates(count = 18) {
  const days = []
  let cursor = todayISO()
  for (let i = 0; i < 60 && days.length < count; i += 1) {
    if (weekday(cursor) !== 0) days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

function isPastSlot(date, time) {
  const today = todayISO()
  if (date < today) return true
  if (date > today) return false
  const start = timeToMin(time)
  const now = bahiaParts()
  return start < now.hour * 60 + now.minute + 20
}

function isFuture(date, time) {
  if (!time || time === "--") return false
  const today = todayISO()
  if (date > today) return true
  if (date < today) return false
  const start = timeToMin(time)
  const now = bahiaParts()
  return start > now.hour * 60 + now.minute
}

function rowToAppt(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    serviceId: row.service_id,
    barberId: row.barber_id,
    date: row.date,
    time: row.time,
    status: row.status,
    freeCut: Boolean(row.free_cut),
    kind: row.kind,
    createdAt: row.created_at,
  }
}

function holdStarts(time, serviceId) {
  const start = timeToMin(time)
  const block = blockedMinutes(serviceId)
  const starts = []
  for (let cursor = start; cursor < start + block; cursor += HOUSE.slot) starts.push(cursor)
  return starts
}

function validPerson(name, phone) {
  const clean = cleanName(name)
  const p = digits(phone)
  if (clean.length < 2 || clean.length > 60) return { ok: false, error: "Como a gente te chama?" }
  if (p.length < 10 || p.length > 11) return { ok: false, error: "Preciso do telefone com DDD." }
  return { ok: true, name: clean, phone: p }
}

async function readJson(request) {
  const text = await request.text()
  if (text.length > 20000) return { ok: false, error: "Mensagem grande demais.", status: 413 }
  try {
    return { ok: true, data: text ? JSON.parse(text) : {} }
  } catch {
    return { ok: false, error: "Não entendi o pedido.", status: 400 }
  }
}

function slotsForDay(date, serviceId, taken) {
  if (weekday(date) === 0) return []
  const block = blockedMinutes(serviceId)
  const slots = []
  for (let start = HOUSE.open; start + block <= HOUSE.close; start += HOUSE.slot) {
    const conflict = taken.some((item) =>
      overlap(start, block, timeToMin(item.time), blockedMinutes(item.service_id)),
    )
    slots.push({ time: minToTime(start), free: !conflict && !isPastSlot(date, minToTime(start)) })
  }
  return slots
}

function slotOnGrid(time, serviceId) {
  if (!/^\d{2}:\d{2}$/.test(String(time || ""))) return false
  const start = timeToMin(time)
  const block = blockedMinutes(serviceId)
  if (Number.isNaN(start) || start % HOUSE.slot !== 0) return false
  return start >= HOUSE.open && start + block <= HOUSE.close
}

async function takenBetween(env, barberId, from, to) {
  const { results } = await env.DB.prepare(
    `SELECT date, time, service_id FROM appointments
     WHERE kind = 'reserva' AND status != 'cancelado' AND barber_id = ? AND date >= ? AND date <= ?`,
  )
    .bind(barberId, from, to)
    .all()
  return results || []
}

async function loyaltyAvailable(env, phone) {
  const row = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status = 'concluido' AND free_cut = 0 THEN 1 ELSE 0 END) AS paid,
       SUM(CASE WHEN free_cut = 1 AND status != 'cancelado' THEN 1 ELSE 0 END) AS reserved
     FROM appointments WHERE client_phone = ?`,
  )
    .bind(phone)
    .first()
  const paid = Number(row?.paid || 0)
  const reserved = Number(row?.reserved || 0)
  return Math.max(0, Math.floor(paid / HOUSE.loyaltyEvery) - reserved)
}

function takenConflict(taken, time, serviceId) {
  const start = timeToMin(time)
  const block = blockedMinutes(serviceId)
  return taken.some((item) => overlap(start, block, timeToMin(item.time), blockedMinutes(item.service_id)))
}

async function insertReserva(env, appt) {
  const starts = holdStarts(appt.time, appt.serviceId)
  const stmts = []
  for (const start of starts) {
    stmts.push(
      env.DB.prepare(`INSERT INTO holds (date, barber_id, start_min, appointment_id) VALUES (?, ?, ?, ?)`).bind(
        appt.date,
        appt.barberId,
        start,
        appt.id,
      ),
    )
    stmts.push(
      env.DB.prepare(`INSERT INTO client_holds (date, phone, start_min, appointment_id) VALUES (?, ?, ?, ?)`).bind(
        appt.date,
        appt.clientPhone,
        start,
        appt.id,
      ),
    )
  }
  stmts.push(
    env.DB.prepare(
      `INSERT INTO appointments (
        id, client_name, client_phone, service_id, barber_id, date, time, status, free_cut, kind, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'agendado', ?, 'reserva', ?)`,
    ).bind(
      appt.id,
      appt.clientName,
      appt.clientPhone,
      appt.serviceId,
      appt.barberId,
      appt.date,
      appt.time,
      appt.freeCut ? 1 : 0,
      appt.createdAt,
    ),
  )
  await env.DB.batch(stmts)
}

function isConstraint(error) {
  return /UNIQUE|constraint|PRIMARY KEY/i.test(String(error?.message || error))
}

function bytesToB64url(bytes) {
  let bin = ""
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function hmac(secret, value) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value))
  return bytesToB64url(new Uint8Array(sig))
}

function safeEqual(a, b) {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  const len = Math.max(left.length, right.length)
  let out = left.length ^ right.length
  for (let i = 0; i < len; i += 1) out |= (left[i] || 0) ^ (right[i] || 0)
  return out === 0
}

async function issueToken(secret) {
  const exp = String(Math.floor(Date.now() / 1000) + 12 * 60 * 60)
  return `${exp}.${await hmac(secret, exp)}`
}

async function tokenOk(token, secret) {
  if (!token || !secret) return false
  const dot = token.indexOf(".")
  if (dot < 1) return false
  const exp = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!safeEqual(sig, await hmac(secret, exp))) return false
  return Number(exp) > Math.floor(Date.now() / 1000)
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || ""
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return ""
}

function sessionCookie(token, secure) {
  const bits = [`ma_painel=${encodeURIComponent(token)}`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=43200"]
  if (secure) bits.push("Secure")
  return bits.join("; ")
}

function clearCookie(secure) {
  const bits = ["ma_painel=", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"]
  if (secure) bits.push("Secure")
  return bits.join("; ")
}

async function authorized(request, env) {
  return tokenOk(readCookie(request, "ma_painel"), env.COOKIE_SECRET || "")
}

async function requirePainel(request, env) {
  if (!env.PAINEL_PIN || !env.COOKIE_SECRET) {
    return json({ error: "A área da casa ainda não tem código." }, 503)
  }
  if (!(await authorized(request, env))) return json({ error: "Entra de novo na área da casa." }, 401)
  return null
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request)
    try {
      return await handle(request, env, url)
    } catch (error) {
      if (isConstraint(error)) return json({ error: "Esse horário acabou de sair. Escolhe outro." }, 409)
      return json({ error: "A agenda não respondeu agora. Tenta de novo." }, 500)
    }
  },
}

async function handle(request, env, url) {
  const path = url.pathname.replace(/\/+$/, "") || "/"
  const secure = url.protocol === "https:"

  if (path === "/api/health" && request.method === "GET") return json({ ok: true })

  if (path === "/api/availability" && request.method === "GET") {
    const barberId = url.searchParams.get("barberId")
    const serviceId = url.searchParams.get("serviceId")
    if (!barberById(barberId) || !serviceById(serviceId)) {
      return json({ error: "Escolhe o serviço e a cadeira." }, 400)
    }
    const days = openDates(18)
    const taken = days.length ? await takenBetween(env, barberId, days[0], days[days.length - 1]) : []
    const byDate = new Map()
    for (const row of taken) {
      const list = byDate.get(row.date) || []
      list.push(row)
      byDate.set(row.date, list)
    }
    return json({
      days: days.map((date) => ({ date, slots: slotsForDay(date, serviceId, byDate.get(date) || []) })),
    })
  }

  if (path === "/api/appointments" && request.method === "POST") {
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status)
    const person = validPerson(body.data.clientName, body.data.clientPhone)
    if (!person.ok) return json({ error: person.error }, 400)
    if (!serviceById(body.data.serviceId) || !barberById(body.data.barberId)) {
      return json({ error: "Escolhe o serviço e a cadeira." }, 400)
    }
    const date = String(body.data.date || "")
    const time = String(body.data.time || "")
    if (!validDate(date) || weekday(date) === 0) return json({ error: "Domingo a casa fecha." }, 400)
    if (!openDates(18).includes(date)) return json({ error: "Escolhe um dia da agenda." }, 400)
    if (!slotOnGrid(time, body.data.serviceId) || isPastSlot(date, time)) {
      return json({ error: "Esse horário acabou de sair. Escolhe outro." }, 409)
    }
    const dayTaken = (await takenBetween(env, body.data.barberId, date, date)).filter((item) => item.date === date)
    if (takenConflict(dayTaken, time, body.data.serviceId)) {
      return json({ error: "Esse horário acabou de sair. Escolhe outro." }, 409)
    }
    const { results: mine } = await env.DB.prepare(
      `SELECT time, service_id FROM appointments
       WHERE kind = 'reserva' AND status != 'cancelado' AND client_phone = ? AND date = ?`,
    )
      .bind(person.phone, date)
      .all()
    if (takenConflict(mine || [], time, body.data.serviceId)) {
      return json({ error: "Você já tem um horário nesse período." }, 409)
    }
    const freeCut = Boolean(body.data.freeCut)
    if (freeCut && (await loyaltyAvailable(env, person.phone)) < 1) {
      return json({ error: "Esse telefone ainda não tem corte de fidelidade." }, 400)
    }
    const appointment = {
      id: crypto.randomUUID(),
      clientName: person.name,
      clientPhone: person.phone,
      serviceId: body.data.serviceId,
      barberId: body.data.barberId,
      date,
      time,
      status: "agendado",
      freeCut,
      kind: "reserva",
      createdAt: new Date().toISOString(),
    }
    try {
      await insertReserva(env, appointment)
    } catch (error) {
      if (isConstraint(error)) return json({ error: "Esse horário acabou de sair. Escolhe outro." }, 409)
      throw error
    }
    return json({ ok: true, appointment }, 201)
  }

  if (path === "/api/me" && request.method === "GET") {
    const phone = digits(url.searchParams.get("phone"))
    if (phone.length < 10 || phone.length > 11) return json({ appointments: [] })
    const { results } = await env.DB.prepare(
      `SELECT * FROM appointments WHERE client_phone = ? ORDER BY date, time`,
    )
      .bind(phone)
      .all()
    return json({ appointments: (results || []).map(rowToAppt) })
  }

  if (path === "/api/cancel" && request.method === "POST") {
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status)
    const phone = digits(body.data.phone)
    const id = String(body.data.id || "")
    const row = await env.DB.prepare(`SELECT * FROM appointments WHERE id = ? AND client_phone = ?`).bind(id, phone).first()
    if (!row || row.status !== "agendado" || row.kind !== "reserva") {
      return json({ error: "Esse horário não pode ser cancelado por aqui." }, 400)
    }
    if (!isFuture(row.date, row.time)) return json({ error: "Esse horário já passou. Fala com a casa." }, 400)
    await env.DB.batch([
      env.DB.prepare(`UPDATE appointments SET status = 'cancelado' WHERE id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM holds WHERE appointment_id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM client_holds WHERE appointment_id = ?`).bind(id),
    ])
    return json({ ok: true })
  }

  if (path === "/api/mural" && request.method === "GET") {
    const { results } = await env.DB.prepare(`SELECT * FROM notes ORDER BY created_at DESC LIMIT 100`).all()
    return json(
      (results || []).map((row) => ({
        _id: row.id,
        kind: row.kind,
        name: row.name,
        text: row.text,
        createdAt: row.created_at,
      })),
    )
  }

  if (path === "/api/mural" && request.method === "POST") {
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status)
    const kind = String(body.data.kind || "")
    const text = String(body.data.text || "").trim().replace(/\s+/g, " ")
    const name = cleanName(body.data.name || "") || "Alguém da vila"
    if (!KINDS.has(kind)) return json({ error: "Escolhe crítica, opinião ou elogio." }, 400)
    if (text.length < 8) return json({ error: "Escreve um pouco mais, pelo menos uma frase." }, 400)
    if (text.length > 400 || name.length > 40) return json({ error: "Cabe até 400 caracteres." }, 400)
    const note = {
      _id: crypto.randomUUID(),
      kind,
      name,
      text,
      createdAt: new Date().toISOString(),
    }
    await env.DB.prepare(`INSERT INTO notes (id, kind, name, text, created_at) VALUES (?, ?, ?, ?, ?)`).bind(
      note._id,
      note.kind,
      note.name,
      note.text,
      note.createdAt,
    ).run()
    return json(note, 201)
  }

  if (path === "/api/painel/login" && request.method === "POST") {
    if (!env.PAINEL_PIN || !env.COOKIE_SECRET) return json({ error: "A área da casa ainda não tem código." }, 503)
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status)
    const pin = String(body.data.pin || "").trim().toLowerCase()
    const expected = String(env.PAINEL_PIN).trim().toLowerCase()
    if (!safeEqual(pin, expected)) return json({ error: "Código incorreto." }, 401)
    const token = await issueToken(env.COOKIE_SECRET)
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(token, secure) })
  }

  if (path === "/api/painel/logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": clearCookie(secure) })
  }

  const noteMatch = path.match(/^\/api\/painel\/notes\/([0-9a-f-]{36})$/i)
  if (noteMatch && request.method === "DELETE") {
    const denied = await requirePainel(request, env)
    if (denied) return denied
    await env.DB.prepare(`DELETE FROM notes WHERE id = ?`).bind(noteMatch[1]).run()
    return json({ ok: true })
  }

  const denied = path.startsWith("/api/painel/") ? await requirePainel(request, env) : null
  if (denied) return denied

  if (path === "/api/painel/appointments" && request.method === "GET") {
    const { results } = await env.DB.prepare(`SELECT * FROM appointments ORDER BY date, time, barber_id LIMIT 5000`).all()
    return json({ appointments: (results || []).map(rowToAppt) })
  }

  if (path === "/api/painel/status" && request.method === "POST") {
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status)
    const status = String(body.data.status || "")
    const id = String(body.data.id || "")
    if (!["agendado", "cancelado", "concluido"].includes(status)) return json({ error: "Status inválido." }, 400)
    const row = await env.DB.prepare(`SELECT * FROM appointments WHERE id = ?`).bind(id).first()
    if (!row) return json({ error: "Horário não encontrado." }, 404)
    if (status === "cancelado") {
      await env.DB.batch([
        env.DB.prepare(`UPDATE appointments SET status = 'cancelado' WHERE id = ?`).bind(id),
        env.DB.prepare(`DELETE FROM holds WHERE appointment_id = ?`).bind(id),
        env.DB.prepare(`DELETE FROM client_holds WHERE appointment_id = ?`).bind(id),
      ])
      return json({ ok: true })
    }
    if (status === "agendado" && row.status === "cancelado" && row.kind === "reserva") {
      const stmts = [env.DB.prepare(`UPDATE appointments SET status = 'agendado' WHERE id = ?`).bind(id)]
      for (const start of holdStarts(row.time, row.service_id)) {
        stmts.push(
          env.DB.prepare(`INSERT INTO holds (date, barber_id, start_min, appointment_id) VALUES (?, ?, ?, ?)`).bind(
            row.date,
            row.barber_id,
            start,
            id,
          ),
        )
        stmts.push(
          env.DB.prepare(`INSERT INTO client_holds (date, phone, start_min, appointment_id) VALUES (?, ?, ?, ?)`).bind(
            row.date,
            row.client_phone,
            start,
            id,
          ),
        )
      }
      try {
        await env.DB.batch(stmts)
      } catch (error) {
        if (isConstraint(error)) return json({ error: "Esse horário já foi ocupado." }, 409)
        throw error
      }
      return json({ ok: true })
    }
    await env.DB.prepare(`UPDATE appointments SET status = ? WHERE id = ?`).bind(status, id).run()
    return json({ ok: true })
  }

  if (path === "/api/painel/stamp" && request.method === "POST") {
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status)
    const person = validPerson(body.data.name, body.data.phone)
    if (!person.ok) return json({ error: person.error }, 400)
    if (!serviceById(body.data.serviceId) || !barberById(body.data.barberId)) {
      return json({ error: "Escolhe o serviço e a cadeira." }, 400)
    }
    const freeCut = Boolean(body.data.freeCut)
    const count = freeCut ? 1 : Math.max(1, Math.min(30, Number(body.data.count) || 1))
    if (freeCut && (await loyaltyAvailable(env, person.phone)) < 1) {
      return json({ error: "Esse cliente ainda não tem corte grátis." }, 400)
    }
    const createdAt = new Date().toISOString()
    const stmts = []
    for (let i = 0; i < count; i += 1) {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO appointments (
            id, client_name, client_phone, service_id, barber_id, date, time, status, free_cut, kind, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, '--', 'concluido', ?, 'carimbo', ?)`,
        ).bind(
          crypto.randomUUID(),
          person.name,
          person.phone,
          body.data.serviceId,
          body.data.barberId,
          todayISO(),
          freeCut ? 1 : 0,
          createdAt,
        ),
      )
    }
    await env.DB.batch(stmts)
    return json({ ok: true, count })
  }

  if (path === "/api/painel/wipe" && request.method === "POST") {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM holds`),
      env.DB.prepare(`DELETE FROM client_holds`),
      env.DB.prepare(`DELETE FROM appointments`),
    ])
    return json({ ok: true })
  }

  return json({ error: "Não encontrado." }, 404)
}
