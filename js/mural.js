export const MURAL_URL = "https://crudcrud.com/api/2eb3684176ef4b4d938e0987bfd68698/mural"

export const KINDS = {
  critica: "Crítica",
  opiniao: "Opinião",
  elogio: "Elogio",
}

async function request(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchNotes() {
  const response = await request(MURAL_URL)
  if (!response.ok) throw new Error("mural")
  const notes = await response.json()
  return notes
    .filter((note) => note && typeof note.text === "string" && KINDS[note.kind])
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
}

export async function postNote(note) {
  const response = await request(MURAL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: note.kind,
      name: note.name,
      text: note.text,
      createdAt: note.createdAt,
    }),
  })
  if (!response.ok) throw new Error("mural")
  return response.json()
}

export async function removeNote(id) {
  const response = await request(`${MURAL_URL}/${id}`, { method: "DELETE" })
  if (!response.ok && response.status !== 404) throw new Error("mural")
}
