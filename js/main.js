import { BARBERS, HOUSE, SERVICES } from "./data.js"
import {
  barberById,
  brl,
  cancelByClient,
  cleanName,
  clearAppointments,
  clearSession,
  clients,
  createAppointment,
  dayParts,
  digits,
  formatLong,
  formatPhone,
  getAppointments,
  getSession,
  isoFromDate,
  isFuture,
  load,
  loyaltyLine,
  loyaltyOf,
  openDates,
  parseISO,
  reservationsOn,
  serviceById,
  setSession,
  setStatus,
  slotsFor,
  stampCuts,
} from "./store.js"

const draft = {
  step: 0,
  serviceId: null,
  barberId: null,
  date: null,
  time: null,
  name: "",
  phone: "",
  useFree: false,
  switching: false,
  done: null,
  error: "",
}

const app = { tab: "inicio" }
let painelOk = sessionStorage.getItem("ma-painel") === "ok"
let painelDate = ""
let painelMsg = ""
let painelError = ""
let prefill = { name: "", phone: "", count: 1, serviceId: "classico", barberId: "cadeira-m" }

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char])
}

function boardHtml(list) {
  return `<div class="board">${list
    .map(
      (service) => `<div class="board-row">
        <div><strong>${esc(service.name)}</strong><small>${service.minutes} min · ${esc(service.detail)}</small></div>
        <span>${brl(service.price)}</span>
      </div>`,
    )
    .join("")}</div>`
}

function fillBoards() {
  const preview = ["classico", "barba", "combo"].map((id) => serviceById(id))
  document.querySelector("#home-board").innerHTML = boardHtml(preview)
  document.querySelector("#full-board").innerHTML = boardHtml(SERVICES)
  document.querySelector("#chair-list").innerHTML = BARBERS.map(
    (barber) => `<article class="chair">
      <span class="monogram">${esc(barber.short)}</span>
      <span><strong>${esc(barber.name)}</strong><small>${esc(barber.specialty)}</small></span>
    </article>`,
  ).join("")
}

function wizardHost() {
  if (document.body.dataset.view === "app") return document.querySelector("#app-wizard")
  return document.querySelector("#wizard")
}

function crumb() {
  const service = serviceById(draft.serviceId)
  const barber = barberById(draft.barberId)
  const bits = []
  if (service) bits.push(service.name)
  if (barber && draft.step > 1) bits.push(barber.name)
  if (draft.date && draft.step > 2) bits.push(formatLong(draft.date))
  if (draft.time && draft.step > 3) bits.push(draft.time)
  return bits.length ? `<p class="crumb">${bits.map(esc).join(" · ")}</p>` : ""
}

function bookingPhone() {
  const session = getSession()
  if (session && !draft.switching) return session.phone
  return digits(draft.phone)
}

function freeSlotHtml() {
  const phone = bookingPhone()
  if (phone.length < 10) return ""
  const info = loyaltyOf(phone)
  if (info.available < 1) return ""
  return `<label class="free-toggle">
    <input type="checkbox" name="free" ${draft.useFree ? "checked" : ""} />
    <span>Usar meu corte de fidelidade</span>
    <small>${esc(loyaltyLine(info))} Cortesia não soma carimbo novo.</small>
  </label>`
}

function stepBody() {
  if (draft.step === 0) {
    return SERVICES.map(
      (service) => `<button type="button" class="choice ${draft.serviceId === service.id ? "on" : ""}" data-act="service" data-id="${service.id}">
        <span><strong>${esc(service.name)}</strong><small>${service.minutes} min · ${esc(service.detail)}</small></span>
        <em>${brl(service.price)}</em>
      </button>`,
    ).join("")
  }
  if (draft.step === 1) {
    return BARBERS.map(
      (barber) => `<button type="button" class="choice ${draft.barberId === barber.id ? "on" : ""}" data-act="barber" data-id="${barber.id}">
        <span class="monogram">${esc(barber.short)}</span>
        <span><strong>${esc(barber.name)}</strong><small>${esc(barber.specialty)}</small></span>
      </button>`,
    ).join("")
  }
  if (draft.step === 2) {
    const days = openDates(18)
      .map((date) => {
        const parts = dayParts(date)
        const free = slotsFor(date, draft.barberId, draft.serviceId).filter((slot) => slot.free).length
        return `<button type="button" class="day-chip ${draft.date === date ? "on" : ""}" data-act="date" data-date="${date}" ${free ? "" : "disabled"}>
          <small>${esc(parts.weekday)}</small><strong>${parts.day}</strong><small>${free ? esc(parts.month) : "lotado"}</small>
        </button>`
      })
      .join("")
    return `<div class="day-scroller">${days}</div><p>Domingo a casa fecha. ${esc(HOUSE.place)}.</p>`
  }
  if (draft.step === 3) {
    const slots = slotsFor(draft.date, draft.barberId, draft.serviceId)
    return `<div class="time-grid">${slots
      .map(
        (slot) =>
          `<button type="button" class="time-chip ${draft.time === slot.time ? "on" : ""}" data-act="time" data-time="${slot.time}" ${slot.free ? "" : "disabled"}>${slot.time}</button>`,
      )
      .join("")}</div>`
  }
  const service = serviceById(draft.serviceId)
  const barber = barberById(draft.barberId)
  const session = getSession()
  const known = session && !draft.switching
  const price = draft.useFree ? "Cortesia da casa" : brl(service.price)
  return `<form id="confirm-form">
    <dl class="ticket">
      <div><dt>Serviço</dt><dd>${esc(service.name)}</dd></div>
      <div><dt>Cadeira</dt><dd>${esc(barber.name)}</dd></div>
      <div><dt>Quando</dt><dd>${esc(formatLong(draft.date))} · ${esc(draft.time)}</dd></div>
      <div><dt>Valor</dt><dd id="price-line">${esc(price)}</dd></div>
      <div><dt>Onde</dt><dd>${esc(HOUSE.place)}</dd></div>
    </dl>
    ${
      known
        ? `<p>Agendando como <strong>${esc(session.name)}</strong> · ${esc(formatPhone(session.phone))}</p>
           <button type="button" class="back" data-act="switch-client">Não sou eu</button>
           <input type="hidden" name="name" value="${esc(session.name)}" />
           <input type="hidden" name="phone" value="${esc(session.phone)}" />`
        : `<label class="field">Seu nome<input name="name" required maxlength="60" autocomplete="name" value="${esc(draft.name)}" /></label>
           <label class="field">Telefone com DDD<input name="phone" required inputmode="tel" maxlength="16" autocomplete="tel" placeholder="(71) 90000-0000" value="${esc(draft.phone)}" /></label>`
    }
    <div id="free-slot">${freeSlotHtml()}</div>
    ${draft.error ? `<p class="error">${esc(draft.error)}</p>` : ""}
    <button class="btn btn-gold" type="submit">Confirmar horário</button>
  </form>`
}

function ticketHtml(appointment) {
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  return `<article class="ticket">
    <p class="ticket-brand">M&amp;A Barber</p>
    <h2>Horário confirmado</h2>
    <p class="ticket-code">Reserva ${esc(appointment.id.slice(0, 4).toUpperCase())}</p>
    <dl>
      <div><dt>Serviço</dt><dd>${esc(service.name)}</dd></div>
      <div><dt>Cadeira</dt><dd>${esc(barber.name)}</dd></div>
      <div><dt>Quando</dt><dd>${esc(formatLong(appointment.date))} · ${esc(appointment.time)}</dd></div>
      <div><dt>Valor</dt><dd>${appointment.freeCut ? "Cortesia da casa" : brl(service.price)}</dd></div>
    </dl>
    <p>${esc(HOUSE.place)}<br />${esc(HOUSE.city)}</p>
    <div class="ticket-actions">
      <a class="btn btn-gold" href="#/app">Ver no app</a>
      <button type="button" class="btn btn-ghost" data-act="reset">Marcar outro</button>
    </div>
  </article>`
}

function renderWizard() {
  const root = wizardHost()
  if (!root) return
  if (draft.done) {
    root.innerHTML = ticketHtml(draft.done)
    return
  }
  const steps = ["Serviço", "Cadeira", "Dia", "Hora", "Confirmar"]
  root.innerHTML = `
    <ol class="stepper">${steps
      .map((label, index) => `<li class="${index === draft.step ? "on" : index < draft.step ? "ok" : ""}">${label}</li>`)
      .join("")}</ol>
    ${draft.step > 0 ? `<button type="button" class="back" data-act="back">Voltar</button>` : ""}
    ${crumb()}
    ${stepBody()}
  `
  const action = root.querySelector(".btn-gold")
  if (action && document.body.dataset.view === "app") {
    action.scrollIntoView({ block: "center" })
  }
}

function syncFreeSlot() {
  const slot = document.querySelector("#free-slot")
  if (!slot) return
  const phone = bookingPhone()
  const info = phone.length >= 10 ? loyaltyOf(phone) : null
  const show = Boolean(info && info.available > 0)
  if (!show) {
    slot.innerHTML = ""
    draft.useFree = false
  } else if (!slot.querySelector("input")) {
    draft.useFree = true
    slot.innerHTML = freeSlotHtml()
  }
  const price = document.querySelector("#price-line")
  const service = serviceById(draft.serviceId)
  if (price && service) price.textContent = draft.useFree ? "Cortesia da casa" : brl(service.price)
}

function loyaltyCardHtml(phone) {
  const info = loyaltyOf(phone)
  const stamps = Array.from({ length: info.every }, (_, index) => {
    const on = index < info.progress
    return `<span class="stamp ${on ? "on" : ""}">${on ? "✦" : index + 1}</span>`
  }).join("")
  const gift =
    info.available > 0
      ? `<div class="gift-banner"><strong>${info.available === 1 ? "1 corte grátis liberado" : `${info.available} cortes grátis liberados`}</strong><small>O cartão recomeçou. O prêmio fica guardado até você usar.</small></div>`
      : ""
  return `<article class="loyalty">${gift}
    <p class="loyalty-count">${info.done} ${info.done === 1 ? "corte" : "cortes"} na cadeira</p>
    <div class="stamps">${stamps}</div>
    <p>${esc(loyaltyLine(info))}</p>
    <p>Cortesia não entra na contagem dos ${info.every}.</p>
  </article>`
}

function miniStamps(phone) {
  const info = loyaltyOf(phone)
  return `<span class="mini-stamps">${Array.from({ length: info.every }, (_, index) => `<i class="${index < info.progress ? "on" : ""}"></i>`).join("")}</span>`
}

function renderApp() {
  const body = document.querySelector("#app-body")
  const tabs = document.querySelector("#app-tabs")
  const session = getSession()
  if (!session) {
    tabs.hidden = true
    body.innerHTML = `<form id="gate-form" class="gate">
      <p class="section-kicker">Sua cadeira</p>
      <h2>Entra com seu nome.</h2>
      <p>O telefone acha sua agenda e seu cartão neste aparelho. A casa fica na Vila Militar, ao lado do Condomínio Coqueiros de Itapuã.</p>
      <label class="field">Nome<input name="name" required maxlength="60" autocomplete="name" /></label>
      <label class="field">Telefone com DDD<input name="phone" required inputmode="tel" maxlength="16" autocomplete="tel" placeholder="(71) 90000-0000" /></label>
      ${app.error ? `<p class="error">${esc(app.error)}</p>` : ""}
      <button class="btn btn-gold" type="submit">Entrar no app</button>
      <p>No celular, use o menu do navegador e escolha “Adicionar à tela inicial”.</p>
    </form>`
    return
  }
  tabs.hidden = false
  const labels = [
    ["inicio", "Início"],
    ["agendar", "Agendar"],
    ["cartao", "Cartão"],
    ["agenda", "Agenda"],
  ]
  tabs.innerHTML = labels
    .map(([id, label]) => `<button type="button" class="tab ${app.tab === id ? "on" : ""}" data-tab="${id}">${label}</button>`)
    .join("")
  if (app.tab === "agendar") {
    body.innerHTML = `<div id="app-wizard" class="wizard"></div>`
    renderWizard()
    return
  }
  if (app.tab === "cartao") {
    body.innerHTML = `${loyaltyCardHtml(session.phone)}<p>Os cortes de balcão também entram no cartão. Eles não aparecem como horário marcado.</p>`
    return
  }
  if (app.tab === "agenda") {
    const mine = getAppointments().filter((item) => item.clientPhone === session.phone && item.kind === "reserva")
    const upcoming = mine.filter((item) => item.status === "agendado").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    const past = mine.filter((item) => item.status !== "agendado").sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 8)
    const block = (list, empty) =>
      list.length
        ? list
            .map((item) => {
              const service = serviceById(item.serviceId)
              const barber = barberById(item.barberId)
              const canCancel = item.status === "agendado" && isFuture(item.date, item.time)
              return `<article class="appt ${item.status}">
                <strong>${esc(formatLong(item.date))} · ${esc(item.time)}</strong>
                <p>${esc(service?.name || "")} · ${esc(barber?.name || "")}${item.freeCut ? " · cortesia" : ""}</p>
                <span class="tag">${item.status}</span>
                ${canCancel ? `<button type="button" class="text-btn" data-cancel="${item.id}">Cancelar</button>` : ""}
              </article>`
            })
            .join("")
        : `<p>${empty}</p>`
    body.innerHTML = `<h2>Agenda</h2>${block(upcoming, "Nenhum horário marcado.")}<h2>Já passou</h2>${block(past, "Sem histórico ainda.")}`
    return
  }
  const next = getAppointments()
    .filter((item) => item.clientPhone === session.phone && item.kind === "reserva" && item.status === "agendado")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  const nextHtml = next
    ? `<article class="appt"><strong>Próximo horário</strong><p>${esc(formatLong(next.date))} · ${esc(next.time)} · ${esc(serviceById(next.serviceId)?.name || "")}</p><p>${esc(HOUSE.place)}</p></article>`
    : `<p>Nenhum horário marcado.</p><button type="button" class="btn btn-gold" data-tab="agendar">Agendar agora</button>`
  body.innerHTML = `<p class="section-kicker">Olá, ${esc(session.name.split(" ")[0])}</p>
    <h2>Sua cadeira na vila.</h2>
    ${nextHtml}
    ${loyaltyCardHtml(session.phone)}
    <button type="button" class="back" data-logout>Sair deste aparelho</button>`
}

function shiftDate(iso, delta) {
  const date = parseISO(iso)
  date.setDate(date.getDate() + delta)
  return isoFromDate(date)
}

function renderPainel() {
  const root = document.querySelector("#painel-root")
  if (!painelOk) {
    root.innerHTML = `<form id="pin-form" class="pin-gate">
      <p class="section-kicker">Área da casa</p>
      <h1>Livro do dia.</h1>
      <p>Código de quem trabalha na M&amp;A, na Vila Militar.</p>
      <label class="field">Código<input name="pin" type="password" autocomplete="current-password" required /></label>
      ${painelError ? `<p class="error">${esc(painelError)}</p>` : ""}
      <button class="btn btn-gold" type="submit">Entrar</button>
    </form>`
    return
  }
  if (!painelDate) painelDate = isoFromDate(new Date())
  const rows = reservationsOn(painelDate)
  const closed = parseISO(painelDate).getDay() === 0
  const list = rows.length
    ? rows
        .map((item) => {
          const service = serviceById(item.serviceId)
          const barber = barberById(item.barberId)
          const actions =
            item.status === "agendado"
              ? `<button type="button" class="btn btn-gold" data-status="concluido" data-id="${item.id}">Veio</button>
                 <button type="button" class="btn btn-ghost" data-status="cancelado" data-id="${item.id}">Não veio</button>`
              : `<button type="button" class="btn btn-ghost" data-status="agendado" data-id="${item.id}">Reabrir</button>`
          return `<article class="appt ${item.status}">
            <strong>${esc(item.time)} · ${esc(service?.name || "")}</strong>
            <p>${esc(item.clientName)} · ${esc(formatPhone(item.clientPhone))}</p>
            <p>${esc(barber?.name || "")}${item.freeCut ? " · cortesia" : ""} · <span class="tag">${item.status}</span></p>
            <p>${esc(loyaltyLine(loyaltyOf(item.clientPhone)))} ${miniStamps(item.clientPhone)}</p>
            <div class="row-actions">${actions}</div>
          </article>`
        })
        .join("")
    : `<p>${closed ? "Domingo a casa fecha." : "Nenhum horário nesta data."}</p>`
  const people = clients()
  const roster = people.length
    ? people
        .map(
          (person) => `<article class="person">
            <strong>${esc(person.name)}</strong>
            <p>${esc(formatPhone(person.phone))} · ${esc(loyaltyLine(loyaltyOf(person.phone)))}</p>
            ${miniStamps(person.phone)}
            <button type="button" class="text-btn" data-use-client="${esc(person.phone)}" data-use-name="${esc(person.name)}">Usar no carimbo</button>
          </article>`,
        )
        .join("")
    : `<p>Nenhum cliente ainda.</p>`
  root.innerHTML = `<header class="page-head">
      <p class="section-kicker">Área da casa</p>
      <h1>Livro do dia.</h1>
      <p>${esc(HOUSE.place)}. ${esc(HOUSE.city)}.</p>
    </header>
    ${painelMsg ? `<p class="ok-note">${esc(painelMsg)}</p>` : ""}
    <div class="panel-grid">
      <div>
        <div class="date-bar">
          <button type="button" class="btn btn-ghost" data-shift="-1">Dia anterior</button>
          <strong>${esc(formatLong(painelDate))}</strong>
          <button type="button" class="btn btn-ghost" data-shift="1">Próximo dia</button>
        </div>
        ${list}
      </div>
      <div>
        <form id="stamp-form">
          <p class="section-kicker">Balcão</p>
          <h2>Carimbar corte</h2>
          <p>Para quem cortou sem reserva, ou para lançar o histórico. Dez cortes pagos liberam um.</p>
          <label class="field">Nome<input name="name" required maxlength="60" value="${esc(prefill.name)}" /></label>
          <label class="field">Telefone<input name="phone" required inputmode="tel" maxlength="16" value="${esc(prefill.phone)}" /></label>
          <label class="field">Serviço<select name="serviceId">${SERVICES.map((service) => `<option value="${service.id}" ${prefill.serviceId === service.id ? "selected" : ""}>${esc(service.name)}</option>`).join("")}</select></label>
          <label class="field">Cadeira<select name="barberId">${BARBERS.map((barber) => `<option value="${barber.id}" ${prefill.barberId === barber.id ? "selected" : ""}>${esc(barber.name)}</option>`).join("")}</select></label>
          <label class="field">Quantidade de cortes pagos<input name="count" type="number" min="1" max="30" value="${Number(prefill.count) || 1}" /></label>
          <label class="free-toggle"><input type="checkbox" name="free" /><span>Este é o corte grátis</span><small>Não soma nos dez. Só sai se já houver prêmio.</small></label>
          ${painelError ? `<p class="error">${esc(painelError)}</p>` : ""}
          <button class="btn btn-gold" type="submit">Lançar no cartão</button>
        </form>
        <h2>Cartões</h2>
        ${roster}
        <button type="button" class="btn btn-ghost" data-act="wipe">Apagar agenda e cartões deste aparelho</button>
        <button type="button" class="back" data-act="lock">Trancar a área</button>
      </div>
    </div>`
}

function route() {
  const raw = (location.hash.replace(/^#\/?/, "") || "home").split("?")[0]
  const known = ["home", "historia", "servicos", "agendar", "app", "painel"]
  const page = known.includes(raw) ? raw : "home"
  document.querySelectorAll("[data-page]").forEach((section) => {
    section.hidden = section.dataset.page !== page
  })
  document.body.dataset.view = page
  document.querySelectorAll("[data-page-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.pageLink === page)
  })
  document.body.classList.remove("menu-open")
  const toggle = document.querySelector(".nav-toggle")
  toggle.setAttribute("aria-expanded", "false")
  if (page === "agendar") renderWizard()
  if (page === "app") renderApp()
  if (page === "painel") renderPainel()
  window.scrollTo(0, 0)
  const titles = {
    home: "M&A Barber · Vila Militar, Itapuã",
    historia: "História · M&A Barber",
    servicos: "Serviços · M&A Barber",
    agendar: "Agendar · M&A Barber",
    app: "App · M&A Barber",
    painel: "Área da casa · M&A Barber",
  }
  document.title = titles[page]
}

function resetDraft() {
  draft.step = 0
  draft.serviceId = null
  draft.barberId = null
  draft.date = null
  draft.time = null
  draft.useFree = false
  draft.done = null
  draft.error = ""
  draft.switching = false
}

document.querySelector(".nav-toggle").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open")
  document.querySelector(".nav-toggle").setAttribute("aria-expanded", open ? "true" : "false")
})

document.addEventListener("click", (event) => {
  const wizardButton = event.target.closest(".wizard [data-act]")
  if (wizardButton) {
    const act = wizardButton.dataset.act
    draft.error = ""
    if (act === "service") {
      draft.serviceId = wizardButton.dataset.id
      draft.date = null
      draft.time = null
      draft.step = 1
      draft.done = null
    } else if (act === "barber") {
      draft.barberId = wizardButton.dataset.id
      draft.date = null
      draft.time = null
      draft.step = 2
    } else if (act === "date") {
      draft.date = wizardButton.dataset.date
      draft.time = null
      draft.step = 3
    } else if (act === "time") {
      draft.time = wizardButton.dataset.time
      const phone = bookingPhone()
      draft.useFree = phone.length >= 10 && loyaltyOf(phone).available > 0
      draft.step = 4
    } else if (act === "back") {
      draft.step = Math.max(0, draft.step - 1)
    } else if (act === "switch-client") {
      draft.switching = true
      draft.name = ""
      draft.phone = ""
      draft.useFree = false
    } else if (act === "reset") {
      resetDraft()
    }
    renderWizard()
    return
  }

  const tab = event.target.closest("[data-tab]")
  if (tab && document.body.dataset.view === "app") {
    app.tab = tab.dataset.tab
    app.error = ""
    renderApp()
    return
  }
  if (event.target.closest("[data-logout]")) {
    clearSession()
    app.tab = "inicio"
    renderApp()
    return
  }
  const cancel = event.target.closest("[data-cancel]")
  if (cancel) {
    const result = cancelByClient(cancel.dataset.cancel, getSession()?.phone || "")
    if (!result.ok) app.error = result.error
    renderApp()
    return
  }

  const shift = event.target.closest("[data-shift]")
  if (shift) {
    painelDate = shiftDate(painelDate, Number(shift.dataset.shift))
    painelMsg = ""
    painelError = ""
    renderPainel()
    return
  }
  const statusBtn = event.target.closest("[data-status]")
  if (statusBtn) {
    setStatus(statusBtn.dataset.id, statusBtn.dataset.status)
    painelMsg = statusBtn.dataset.status === "concluido" ? "Presença marcada. O cartão foi atualizado." : "Agenda atualizada."
    painelError = ""
    renderPainel()
    return
  }
  const useClient = event.target.closest("[data-use-client]")
  if (useClient) {
    prefill.phone = useClient.dataset.useClient
    prefill.name = useClient.dataset.useName
    renderPainel()
    return
  }
  const painelAct = event.target.closest("#painel-root [data-act]")
  if (painelAct?.dataset.act === "wipe") {
    if (confirm("Apagar todos os horários e carimbos guardados neste navegador?")) {
      clearAppointments()
      painelMsg = "Agenda zerada neste aparelho."
      painelError = ""
      renderPainel()
    }
    return
  }
  if (painelAct?.dataset.act === "lock") {
    painelOk = false
    sessionStorage.removeItem("ma-painel")
    renderPainel()
  }
})

document.addEventListener("input", (event) => {
  if (event.target.name === "name" && event.target.closest("#confirm-form")) draft.name = event.target.value
  if (event.target.name === "phone" && event.target.closest("#confirm-form")) {
    draft.phone = event.target.value
    syncFreeSlot()
  }
  if (event.target.name === "free" && event.target.closest("#confirm-form")) {
    draft.useFree = event.target.checked
    syncFreeSlot()
  }
})

document.addEventListener("submit", (event) => {
  if (event.target.id === "confirm-form") {
    event.preventDefault()
    const data = new FormData(event.target)
    const freeBox = event.target.querySelector("input[name=free]")
    const result = createAppointment({
      clientName: data.get("name"),
      clientPhone: data.get("phone"),
      serviceId: draft.serviceId,
      barberId: draft.barberId,
      date: draft.date,
      time: draft.time,
      freeCut: Boolean(freeBox && freeBox.checked),
    })
    if (!result.ok) {
      draft.error = result.error
      renderWizard()
      return
    }
    draft.done = result.appointment
    draft.error = ""
    draft.switching = false
    renderWizard()
    return
  }
  if (event.target.id === "gate-form") {
    event.preventDefault()
    const data = new FormData(event.target)
    const name = cleanName(data.get("name"))
    const phone = digits(data.get("phone"))
    if (name.length < 2) {
      app.error = "Como a gente te chama?"
      renderApp()
      return
    }
    if (phone.length < 10 || phone.length > 11) {
      app.error = "Preciso do telefone com DDD."
      renderApp()
      return
    }
    setSession({ name, phone })
    app.error = ""
    app.tab = "inicio"
    renderApp()
    return
  }
  if (event.target.id === "pin-form") {
    event.preventDefault()
    const pin = String(new FormData(event.target).get("pin") || "").trim().toLowerCase()
    if (pin !== HOUSE.pin) {
      painelError = "Código incorreto."
      renderPainel()
      return
    }
    painelOk = true
    painelError = ""
    sessionStorage.setItem("ma-painel", "ok")
    renderPainel()
    return
  }
  if (event.target.id === "stamp-form") {
    event.preventDefault()
    const data = new FormData(event.target)
    prefill = {
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      count: Number(data.get("count") || 1),
      serviceId: String(data.get("serviceId") || "classico"),
      barberId: String(data.get("barberId") || "cadeira-m"),
    }
    const result = stampCuts({
      name: prefill.name,
      phone: prefill.phone,
      serviceId: prefill.serviceId,
      barberId: prefill.barberId,
      count: prefill.count,
      freeCut: data.get("free") === "on",
    })
    if (!result.ok) {
      painelError = result.error
      painelMsg = ""
      renderPainel()
      return
    }
    const info = loyaltyOf(prefill.phone)
    painelError = ""
    painelMsg = data.get("free") === "on" ? "Cortesia carimbada." : `${result.count} corte(s) no cartão. ${loyaltyLine(info)}`
    renderPainel()
  }
})

window.addEventListener("hashchange", route)
window.addEventListener("storage", () => {
  load()
  if (document.body.dataset.view === "app") renderApp()
  if (document.body.dataset.view === "painel") renderPainel()
  if (document.body.dataset.view === "agendar") renderWizard()
})

load()
fillBoards()
document.querySelector("#year").textContent = String(new Date().getFullYear())
route()
