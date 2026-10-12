export const HOUSE = {
  name: "M&A Barber",
  hoursLabel: "Segunda a sábado, 9h às 20h",
  sundayLabel: "Domingo a casa fecha",
  open: 9 * 60,
  close: 20 * 60,
  slot: 30,
  loyaltyEvery: 10,
  place: "Vila Militar, ao lado do Condomínio Coqueiros de Itapuã",
  city: "Itapuã, Salvador — BA",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Condomínio Coqueiros de Itapuã, Itapuã, Salvador, BA"),
}

export const SERVICES = [
  {
    id: "classico",
    name: "Corte",
    minutes: 45,
    price: 35,
    detail: "Tesoura e máquina, com acabamento na nuca.",
  },
  {
    id: "barba",
    name: "Barba",
    minutes: 30,
    price: 28,
    detail: "Barba feita na cadeira.",
  },
  {
    id: "combo",
    name: "Cabelo e barba",
    minutes: 75,
    price: 58,
    detail: "Corte e barba no mesmo horário.",
  },
  {
    id: "cabelo-sobrancelha",
    name: "Cabelo e sobrancelha",
    minutes: 45,
    price: 50,
    detail: "Corte com a sobrancelha.",
  },
  {
    id: "combo-sobrancelha",
    name: "Combo mais sobrancelha",
    minutes: 75,
    price: 65,
    detail: "Cabelo, barba e sobrancelha.",
  },
  {
    id: "sobrancelha",
    name: "Sobrancelha",
    minutes: 20,
    price: 20,
    detail: "Só a sobrancelha.",
  },
  {
    id: "pezinho",
    name: "Pezinho",
    minutes: 20,
    price: 20,
    detail: "Acabamento do pezinho.",
  },
  {
    id: "pigmentacao",
    name: "Pigmentação",
    minutes: 30,
    price: 20,
    detail: "Pigmentação na cadeira.",
  },
]

export const BARBERS = [
  {
    id: "cadeira-m",
    name: "Cadeira M",
    short: "M",
    specialty: "Corte, pezinho e sobrancelha.",
  },
  {
    id: "cadeira-a",
    name: "Cadeira A",
    short: "A",
    specialty: "Barba e cabelo com barba.",
  },
]
