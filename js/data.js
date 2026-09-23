export const HOUSE = {
  name: "M&A Barber",
  hoursLabel: "Segunda a sábado, 9h às 20h",
  sundayLabel: "Domingo a casa fecha",
  open: 9 * 60,
  close: 20 * 60,
  slot: 30,
  loyaltyEvery: 10,
  pin: "casa",
  place: "Vila Militar, ao lado do Condomínio Coqueiros de Itapuã",
  city: "Itapuã, Salvador — BA",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Condomínio Coqueiros de Itapuã, Itapuã, Salvador, BA"),
}

export const SERVICES = [
  {
    id: "classico",
    name: "Corte clássico",
    minutes: 45,
    price: 50,
    detail: "Tesoura e máquina, com acabamento na nuca.",
  },
  {
    id: "degrade",
    name: "Degradê",
    minutes: 45,
    price: 55,
    detail: "Baixo, médio ou alto, do jeito que o cabelo pede.",
  },
  {
    id: "barba",
    name: "Barba na navalha",
    minutes: 30,
    price: 40,
    detail: "Toalha quente, navalha e óleo.",
  },
  {
    id: "combo",
    name: "Corte e barba",
    minutes: 75,
    price: 85,
    detail: "O ritual completo da casa.",
  },
  {
    id: "acabamento",
    name: "Acabamento",
    minutes: 20,
    price: 25,
    detail: "Pezinho, contorno e sobrancelha.",
  },
  {
    id: "infantil",
    name: "Corte infantil",
    minutes: 30,
    price: 40,
    detail: "Para a criançada da vila e do condomínio.",
  },
]

export const BARBERS = [
  {
    id: "cadeira-m",
    name: "Cadeira M",
    short: "M",
    specialty: "Corte clássico, degradê e acabamento.",
  },
  {
    id: "cadeira-a",
    name: "Cadeira A",
    short: "A",
    specialty: "Navalha, barba e o corte com barba.",
  },
]
