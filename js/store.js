import { BARBERS, HOUSE, SERVICES } from "./data.js"

const SKEY = "ma-barber-session-v1"

let appointments = []
let session = null

export function digits(phone) {
  return String(phone || "").replace(/\D/g, "")
}

export function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ")
}

export function brl(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatPhone(phone) {
  const d = digits(phone)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

export function isoFromDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function todayISO() {
  return isoFromDate(new Date())
}

export function formatLong(iso) {
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseISO(iso))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function dayParts(iso) {
  const date = parseISO(iso)
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(date)
    .replace(".", "")
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
  return {
    weekday,
    day: String(date.getDate()).padStart(2, "0"),
    month,
  }
}

export function serviceById(id) {
  return SERVICES.find((item) => item.id === id) || null
}

export function barberById(id) {
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

export function blockedMinutes(serviceId) {
  const service = serviceById(serviceId)
  const real = service ? service.minutes : HOUSE.slot
  return Math.ceil(real / HOUSE.slot) * HOUSE.slot
}

function overlap(aStart, aBlock, bStart, bBlock) {
  return aStart < bStart + bBlock && bStart < aStart + aBlock
}

export function isFuture(date, time) {
  if (!time || time === "--") return false
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm).getTime() > Date.now()
}

export function load() {
  try {
    localStorage.removeItem("ma-barber-db-v1")
  } catch {
    /* o navegador antigo não guarda mais a agenda */
  }
  try {
    const raw = localStorage.getItem(SKEY)
    const parsed = raw ? JSON.parse(raw) : null
    session = parsed && parsed.phone ? parsed : null
  } catch {
    session = null
  }
}

function save() {
  if (session) localStorage.setItem(SKEY, JSON.stringify(session))
  else localStorage.removeItem(SKEY)
}

async function readBody(response) {
  return response.json().catch(() => ({}))
}

export async function fetchAvailability(barberId, serviceId) {
  const params = new URLSearchParams({ barberId, serviceId })
  const response = await fetch(`/api/availability?${params}`)
  const data = await readBody(response)
  if (!response.ok) throw new Error(data.error || "agenda")
  return Array.isArray(data.days) ? data.days : []
}

export async function pullMine(phone) {
  const p = digits(phone)
  const response = await fetch(`/api/me?phone=${encodeURIComponent(p)}`)
  const data = await readBody(response)
  if (!response.ok) throw new Error(data.error || "agenda")
  const incoming = Array.isArray(data.appointments) ? data.appointments : []
  appointments = appointments.filter((item) => item.clientPhone !== p).concat(incoming)
}

export async function pullPainel() {
  const response = await fetch("/api/painel/appointments")
  if (response.status === 401 || response.status === 503) return { ok: false }
  const data = await readBody(response)
  if (!response.ok) throw new Error(data.error || "painel")
  appointments = Array.isArray(data.appointments) ? data.appointments : []
  return { ok: true }
}

export async function loginPainel(pin) {
  const response = await fetch("/api/painel/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  })
  const data = await readBody(response)
  if (!response.ok) return { ok: false, error: data.error || "Código incorreto." }
  return { ok: true }
}

export async function logoutPainel() {
  await fetch("/api/painel/logout", { method: "POST" })
}

export function getAppointments() {
  return appointments
}

export function getSession() {
  return session
}

export function setSession(next) {
  session = next
  save()
}

export function clearSession() {
  session = null
  save()
}

export function loyaltyOf(phone) {
  const p = digits(phone)
  const mine = appointments.filter((item) => item.clientPhone === p)
  const paid = mine.filter((item) => item.status === "concluido" && !item.freeCut).length
  const reservedFree = mine.filter((item) => item.freeCut && item.status !== "cancelado").length
  const every = HOUSE.loyaltyEvery
  return {
    paid,
    done: mine.filter((item) => item.status === "concluido").length,
    progress: paid % every,
    every,
    earned: Math.floor(paid / every),
    available: Math.max(0, Math.floor(paid / every) - reservedFree),
  }
}

export function loyaltyLine(info) {
  if (info.available > 0) {
    return info.available === 1
      ? "Você tem 1 corte por conta da casa."
      : `Você tem ${info.available} cortes por conta da casa.`
  }
  const left = info.every - info.progress
  if (info.progress === 0) return `Complete ${info.every} cortes e o próximo é nosso.`
  if (left === 1) return "Falta 1 corte para o seu grátis."
  return `Faltam ${left} cortes para o seu grátis.`
}

export function openDates(count = 18) {
  const days = []
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  for (let i = 0; i < 60 && days.length < count; i += 1) {
    if (cursor.getDay() !== 0) days.push(isoFromDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function slotsFor(date, barberId, serviceId) {
  const day = parseISO(date)
  if (day.getDay() === 0) return []
  const block = blockedMinutes(serviceId)
  const taken = appointments.filter(
    (item) =>
      item.kind === "reserva" &&
      item.status !== "cancelado" &&
      item.date === date &&
      item.barberId === barberId,
  )
  const now = new Date()
  const minStart = date === todayISO() ? now.getHours() * 60 + now.getMinutes() + 20 : -1
  const slots = []
  for (let start = HOUSE.open; start + block <= HOUSE.close; start += HOUSE.slot) {
    const conflict = taken.some((item) =>
      overlap(start, block, timeToMin(item.time), blockedMinutes(item.serviceId)),
    )
    const past = start < minStart
    slots.push({ time: minToTime(start), free: !conflict && !past })
  }
  return slots
}

function clientBusy(date, phone, time, serviceId) {
  const start = timeToMin(time)
  const block = blockedMinutes(serviceId)
  return appointments.some((item) => {
    if (item.kind !== "reserva" || item.status === "cancelado") return false
    if (item.clientPhone !== phone || item.date !== date) return false
    return overlap(start, block, timeToMin(item.time), blockedMinutes(item.serviceId))
  })
}

function validPerson(name, phone) {
  const clean = cleanName(name)
  const p = digits(phone)
  if (clean.length < 2) return { ok: false, error: "Como a gente te chama?" }
  if (p.length < 10 || p.length > 11) return { ok: false, error: "Preciso do telefone com DDD." }
  return { ok: true, name: clean, phone: p }
}

export async function createAppointment(input) {
  const person = validPerson(input.clientName, input.clientPhone)
  if (!person.ok) return person
  if (!serviceById(input.serviceId) || !barberById(input.barberId)) {
    return { ok: false, error: "Escolhe o serviço e a cadeira." }
  }
  if (parseISO(input.date).getDay() === 0) {
    return { ok: false, error: "Domingo a casa fecha." }
  }
  let response
  try {
    response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: person.name,
        clientPhone: person.phone,
        serviceId: input.serviceId,
        barberId: input.barberId,
        date: input.date,
        time: input.time,
        freeCut: Boolean(input.freeCut),
      }),
    })
  } catch {
    return { ok: false, error: "A agenda não respondeu agora. Tenta de novo." }
  }
  const data = await readBody(response)
  if (!response.ok) return { ok: false, error: data.error || "Não consegui marcar agora." }
  if (data.appointment) appointments.push(data.appointment)
  session = { name: person.name, phone: person.phone }
  save()
  return { ok: true, appointment: data.appointment }
}

export async function setStatus(id, status) {
  const response = await fetch("/api/painel/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  })
  const data = await readBody(response)
  if (!response.ok) return { ok: false, error: data.error || "Não consegui atualizar." }
  return { ok: true }
}

export async function cancelByClient(id, phone) {
  const response = await fetch("/api/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, phone: digits(phone) }),
  })
  const data = await readBody(response)
  if (!response.ok) return { ok: false, error: data.error || "Não consegui cancelar." }
  return { ok: true }
}

export async function stampCuts(input) {
  const person = validPerson(input.name, input.phone)
  if (!person.ok) return person
  const response = await fetch("/api/painel/stamp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: person.name,
      phone: person.phone,
      serviceId: input.serviceId,
      barberId: input.barberId,
      count: input.count,
      freeCut: Boolean(input.freeCut),
    }),
  })
  const data = await readBody(response)
  if (!response.ok) return { ok: false, error: data.error || "Não consegui carimbar." }
  return { ok: true, count: data.count }
}

export function reservationsOn(date) {
  return appointments
    .filter((item) => item.kind === "reserva" && item.date === date)
    .sort((a, b) => a.time.localeCompare(b.time) || a.barberId.localeCompare(b.barberId))
}

export function clients() {
  const map = new Map()
  for (const item of appointments) {
    const prev = map.get(item.clientPhone)
    if (!prev || item.createdAt > prev.last) {
      map.set(item.clientPhone, { phone: item.clientPhone, name: item.clientName, last: item.createdAt })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export async function clearAppointments() {
  const response = await fetch("/api/painel/wipe", { method: "POST" })
  const data = await readBody(response)
  if (!response.ok) return { ok: false, error: data.error || "Não consegui apagar a agenda." }
  appointments = []
  return { ok: true }
}

load()

window.addEventListener("storage", () => {
  load()
})
