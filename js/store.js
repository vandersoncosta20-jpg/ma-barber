import { BARBERS, HOUSE, SERVICES } from "./data.js"

const KEY = "ma-barber-db-v1"
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
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    appointments = Array.isArray(parsed) ? parsed : []
  } catch {
    appointments = []
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
  localStorage.setItem(KEY, JSON.stringify(appointments))
  if (session) localStorage.setItem(SKEY, JSON.stringify(session))
  else localStorage.removeItem(SKEY)
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

export function createAppointment(input) {
  const person = validPerson(input.clientName, input.clientPhone)
  if (!person.ok) return person
  if (!serviceById(input.serviceId) || !barberById(input.barberId)) {
    return { ok: false, error: "Escolhe o serviço e a cadeira." }
  }
  if (parseISO(input.date).getDay() === 0) {
    return { ok: false, error: "Domingo a casa fecha." }
  }
  const slot = slotsFor(input.date, input.barberId, input.serviceId).find((item) => item.time === input.time)
  if (!slot?.free) return { ok: false, error: "Esse horário acabou de sair. Escolhe outro." }
  if (clientBusy(input.date, person.phone, input.time, input.serviceId)) {
    return { ok: false, error: "Você já tem um horário nesse período." }
  }
  if (input.freeCut && loyaltyOf(person.phone).available < 1) {
    return { ok: false, error: "Esse telefone ainda não tem corte de fidelidade." }
  }
  const appointment = {
    id: crypto.randomUUID(),
    clientName: person.name,
    clientPhone: person.phone,
    serviceId: input.serviceId,
    barberId: input.barberId,
    date: input.date,
    time: input.time,
    status: "agendado",
    freeCut: Boolean(input.freeCut),
    kind: "reserva",
    createdAt: new Date().toISOString(),
  }
  appointments.push(appointment)
  session = { name: person.name, phone: person.phone }
  save()
  return { ok: true, appointment }
}

export function setStatus(id, status) {
  const item = appointments.find((entry) => entry.id === id)
  if (!item) return { ok: false, error: "Horário não encontrado." }
  item.status = status
  save()
  return { ok: true }
}

export function cancelByClient(id, phone) {
  const item = appointments.find((entry) => entry.id === id && entry.clientPhone === digits(phone))
  if (!item || item.status !== "agendado" || item.kind !== "reserva") {
    return { ok: false, error: "Esse horário não pode ser cancelado por aqui." }
  }
  if (!isFuture(item.date, item.time)) {
    return { ok: false, error: "Esse horário já passou. Fala com a casa." }
  }
  item.status = "cancelado"
  save()
  return { ok: true }
}

export function stampCuts(input) {
  const person = validPerson(input.name, input.phone)
  if (!person.ok) return person
  if (!serviceById(input.serviceId) || !barberById(input.barberId)) {
    return { ok: false, error: "Escolhe o serviço e a cadeira." }
  }
  const freeCut = Boolean(input.freeCut)
  const count = freeCut ? 1 : Math.max(1, Math.min(30, Number(input.count) || 1))
  if (freeCut && loyaltyOf(person.phone).available < 1) {
    return { ok: false, error: "Esse cliente ainda não tem corte grátis." }
  }
  for (let i = 0; i < count; i += 1) {
    appointments.push({
      id: crypto.randomUUID(),
      clientName: person.name,
      clientPhone: person.phone,
      serviceId: input.serviceId,
      barberId: input.barberId,
      date: todayISO(),
      time: "--",
      status: "concluido",
      freeCut,
      kind: "carimbo",
      createdAt: new Date().toISOString(),
    })
  }
  save()
  return { ok: true, count }
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

export function clearAppointments() {
  appointments = []
  save()
}

load()

window.addEventListener("storage", () => {
  load()
})
