import { brl } from "./store.js"

const CART_KEY = "ma-shop-teste-v1"

const lotion = (id, name, family) => ({
  id,
  name,
  line: "Hidratante",
  family,
  group: "hidratante",
  price: 59.9,
  note: "Hidratante · preço de teste",
  image: `img/shop/${id}.jpg`,
})

const perfume = (id, name, line, family) => ({
  id,
  name,
  line,
  family,
  group: "perfume",
  price: 49,
  note: "Perfume importado · preço de teste",
  image: `img/shop/${id}.jpg`,
})

export const PRODUCTS = [
  perfume("good-girl", "Good Girl", "Feminino", "Floral oriental"),
  perfume("212-vip-rose", "212 VIP Rosé", "Feminino", "Floral frutado amadeirado"),
  perfume("la-vie-est-belle", "La Vie Est Belle", "Feminino", "Floral frutal"),
  perfume("scandal", "Scandal", "Feminino", "Chypre floral"),
  perfume("libre", "Libre", "Feminino", "Amadeirado"),
  perfume("olympea", "Olympéa", "Feminino", "Floral"),
  perfume("coco-mademoiselle", "Coco Mademoiselle", "Feminino", "Floral frutado"),
  perfume("lady-million", "Lady Million", "Feminino", "Intenso"),
  perfume("lily", "Lily", "Feminino", "Floral"),
  perfume("very-good-girl", "Very Good Girl", "Feminino", "Floral frutal"),
  perfume("light-blue", "Light Blue", "Feminino", "Cítrico floral frutal"),
  perfume("delina", "Delina", "Feminino", "Frutado"),
  perfume("212-vip-woman", "212 VIP Woman", "Feminino", "Oriental adocicado"),
  perfume("la-nuit-tresor", "La Nuit Trésor", "Feminino", "Amadeirado ambarado"),
  perfume("chloe", "Chloé", "Feminino", "Floral"),
  perfume("fantasy", "Fantasy", "Feminino", "Floral ambarino"),
  perfume("212-sexy", "212 Sexy", "Feminino", "Floral oriental"),
  perfume("paradoxe", "Paradoxe", "Feminino", "Floral frutado"),
  perfume("fame", "Fame", "Feminino", "Floral amadeirado"),
  perfume("dg-devotion", "DG Devotion", "Feminino", "Floral oriental"),
  perfume("amor-amor", "Amor Amor", "Feminino", "Floral frutado"),
  perfume("cherry", "Cherry", "Feminino", "Frutal"),
  perfume("la-yali", "La Yali", "Feminino", "Doce"),
  perfume("venerata", "Venerata", "Feminino", "Autoral"),
  perfume("delune", "Delune", "Feminino", "Autoral"),
  perfume("sauvage", "Sauvage", "Masculino", "Aromático amadeirado"),
  perfume("one-million", "One Million", "Masculino", "Amadeirado oriental"),
  perfume("baccarat-rouge", "Baccarat Rouge", "Masculino", "Amadeirado"),
  perfume("invictus", "Invictus", "Masculino", "Amadeirado aquático"),
  perfume("bleu-de-chanel", "Bleu de Chanel", "Masculino", "Amadeirado aromático"),
  perfume("malbec", "Malbec", "Masculino", "Amadeirado ambarado"),
  perfume("bad-boy", "Bad Boy", "Masculino", "Amadeirado oriental"),
  perfume("acqua-di-gio", "Acqua di Giò", "Masculino", "Aquático cítrico"),
  perfume("ferrari-black", "Ferrari Scuderia Black", "Masculino", "Amadeirado"),
  perfume("212-vip-men", "212 VIP Men", "Masculino", "Amadeirado oriental"),
  perfume("ysl-y", "Y", "Masculino", "Amadeirado cítrico"),
  perfume("polo-blue", "Polo Blue", "Masculino", "Aromático fougère"),
  perfume("phantom", "Phantom", "Masculino", "Amadeirado oriental"),
  perfume("silver-scent", "Silver Scent", "Masculino", "Amadeirado oriental"),
  perfume("boss-bottled", "Boss Bottled", "Masculino", "Amadeirado oriental"),
  perfume("212-men", "212 Men", "Masculino", "Amadeirado frutal"),
  perfume("invictus-victory", "Invictus Victory", "Masculino", "Intenso ambarino"),
  perfume("erba-pura", "Erba Pura", "Masculino", "Oriental"),
  perfume("legend", "Legend", "Masculino", "Amadeirado ambarado"),
  perfume("212-vip-black", "212 VIP Black", "Masculino", "Aromático fougère oriental"),
  perfume("azzaro", "Azzaro Pour Homme", "Masculino", "Aromático fougère"),
  perfume("althair", "Althair", "Masculino", "Oriental amadeirado"),
  perfume("animale", "Animale", "Masculino", "Frutal"),
  perfume("polo", "Polo", "Masculino", "Amadeirado"),
  perfume("royal-amber", "Royal Amber", "Masculino", "Oriental amadeirado ambarado"),
  perfume("myself", "Myself", "Masculino", "Amadeirado floral"),
  perfume("bvlgari-black", "Bvlgari In Black", "Masculino", "Oriental especiado"),
  perfume("kouros", "Kouros", "Masculino", "Amadeirado intenso"),
  perfume("verus", "Verus", "Masculino", "Autoral"),
  perfume("hayal", "Hayal", "Masculino", "Autoral"),
  perfume("creed-aventus", "Creed Aventus", "Masculino", "Amadeirado"),
  perfume("asad", "Asad", "Masculino", "Oriental"),
  lotion("hidratante-coconut", "Hidratante Coconut Passion", "Victoria's Secret"),
  lotion("hidratante-pure", "Hidratante Pure Seduction", "Victoria's Secret"),
  lotion("hidratante-love", "Hidratante Love Spell", "Victoria's Secret"),
  lotion("hidratante-la-vie", "Hidratante La Vie Est Belle", "Lancôme"),
  lotion("hidratante-scandal", "Hidratante Scandal", "Jean Paul Gaultier"),
  lotion("hidratante-212-rose", "Hidratante 212 VIP Rosé", "Carolina Herrera"),
  lotion("hidratante-one-million", "Hidratante One Million", "Paco Rabanne"),
  {
    id: "camiseta-preta",
    name: "Camiseta M&A preta",
    line: "Camisa",
    family: "P ao GG",
    group: "camisa",
    price: 39.9,
    note: "Camiseta · preço de teste",
  },
  {
    id: "camiseta-areia",
    name: "Camiseta M&A areia",
    line: "Camisa",
    family: "P ao GG",
    group: "camisa",
    price: 59.9,
    note: "Camiseta · preço de teste",
  },
  {
    id: "polo-casa",
    name: "Polo da casa",
    line: "Camisa",
    family: "P ao GG",
    group: "camisa",
    price: 89.9,
    note: "Polo · preço de teste",
  },
]

const GROUPS = [
  ["feminino", "Femininos"],
  ["masculino", "Masculinos"],
  ["hidratante", "Hidratantes"],
  ["camisa", "Camisas"],
]

const SECTION_TITLES = {
  feminino: "Femininos",
  masculino: "Masculinos",
  hidratante: "Hidratantes",
  camisa: "Camisas",
}

let group = "feminino"
let receipt = null

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char])
}

function readCart() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CART_KEY) || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => PRODUCTS.some((product) => product.id === item.id) && item.qty > 0)
  } catch {
    return []
  }
}

function writeCart(cart) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
}

function visibleProducts() {
  return PRODUCTS.filter((product) => {
    if (group === "feminino") return product.group === "perfume" && product.line === "Feminino"
    if (group === "masculino") return product.group === "perfume" && product.line === "Masculino"
    return product.group === group
  })
}

function syncSectionTitle() {
  const title = document.querySelector("#shop-section-title")
  if (title) title.textContent = SECTION_TITLES[group] || ""
}

function cartRows() {
  return readCart()
    .map((item) => {
      const product = PRODUCTS.find((entry) => entry.id === item.id)
      return product ? { ...product, qty: item.qty } : null
    })
    .filter(Boolean)
}

export function renderShop() {
  const grid = document.querySelector("#shop-grid")
  const filters = document.querySelector("#shop-filters")
  const cart = document.querySelector("#shop-cart")
  if (!grid || !filters || !cart) return

  filters.innerHTML = `<div class="shop-filters">${GROUPS.map(
    ([id, label]) =>
      `<button type="button" class="${group === id ? "on" : ""}" data-shop-act="group" data-id="${id}">${label}</button>`,
  ).join("")}</div>`
  syncSectionTitle()

  const products = visibleProducts()
  grid.innerHTML = products.length
    ? products
        .map(
          (product) => `<article class="shop-card">
            ${product.image ? `<img src="${esc(product.image)}" alt="" />` : ""}
            <p class="shop-line">${esc(product.line)}</p>
            <h2>${esc(product.name)}</h2>
            <p>${esc(product.family)}</p>
            <div class="shop-buy">
              <strong>${brl(product.price)}</strong>
              <button type="button" class="btn btn-gold" data-shop-act="add" data-id="${product.id}">Colocar</button>
            </div>
          </article>`,
        )
        .join("")
    : `<p>Nenhum item nesse filtro.</p>`

  const rows = cartRows()
  const total = rows.reduce((sum, row) => sum + row.price * row.qty, 0)
  cart.innerHTML = receipt
    ? `<h2>Pedido de teste</h2>
       <p>Número ${esc(receipt.id)}. Pagamento desligado nesta versão.</p>
       <ul class="shop-lines">${receipt.lines
         .map((row) => `<li><span>${row.qty}× ${esc(row.name)}</span><span>${brl(row.price * row.qty)}</span></li>`)
         .join("")}</ul>
       <p class="shop-total"><span>Total</span><strong>${brl(receipt.total)}</strong></p>
       <button type="button" class="btn btn-ghost" data-shop-act="again">Novo pedido de teste</button>`
    : `<h2>Carrinho</h2>
       ${
         rows.length
           ? `<ul class="shop-lines">${rows
               .map(
                 (row) => `<li>
                   <span>${esc(row.name)}</span>
                   <span class="qty">
                     <button type="button" data-shop-act="dec" data-id="${row.id}" aria-label="Diminuir ${esc(row.name)}">−</button>
                     ${row.qty}
                     <button type="button" data-shop-act="inc" data-id="${row.id}" aria-label="Aumentar ${esc(row.name)}">+</button>
                   </span>
                   <span>${brl(row.price * row.qty)}</span>
                 </li>`,
               )
               .join("")}</ul>
             <p class="shop-total"><span>Total</span><strong>${brl(total)}</strong></p>
             <button type="button" class="btn btn-gold" data-shop-act="checkout">Fechar pedido de teste</button>`
           : `<p>Nenhum item ainda. O pedido de teste não cobra e não sai daqui.</p>`
       }`
}

function changeQty(id, delta) {
  const cart = readCart()
  const found = cart.find((item) => item.id === id)
  if (!found && delta > 0) cart.push({ id, qty: 1 })
  if (found) found.qty = Math.min(10, found.qty + delta)
  writeCart(cart.filter((item) => item.qty > 0))
  receipt = null
  renderShop()
}

export function bindShop() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shop-act]")
    if (!button) return
    const act = button.dataset.shopAct
    const id = button.dataset.id
    if (act === "group") {
      group = id
      renderShop()
    }
    if (act === "add") changeQty(id, 1)
    if (act === "inc") changeQty(id, 1)
    if (act === "dec") changeQty(id, -1)
    if (act === "again") {
      receipt = null
      renderShop()
    }
    if (act === "checkout") {
      const rows = cartRows()
      if (!rows.length) return
      receipt = {
        id: String(Date.now()).slice(-6),
        lines: rows,
        total: rows.reduce((sum, row) => sum + row.price * row.qty, 0),
      }
      writeCart([])
      renderShop()
    }
  })
}
