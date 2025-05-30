import { NextResponse } from "next/server"

export async function GET() {
  // Simulation de logs - remplacer par de vraies données
  const logs = [
    {
      id: "1",
      timestamp: "2024-01-15 14:30:15",
      level: "success",
      message: 'Collection "Films Marvel" créée avec succès',
      library: "Films",
      collection: "Films Marvel",
      details: "23 éléments ajoutés à la collection",
    },
    {
      id: "2",
      timestamp: "2024-01-15 14:30:10",
      level: "info",
      message: "Recherche des films Marvel en cours...",
      library: "Films",
    },
    {
      id: "3",
      timestamp: "2024-01-15 14:29:58",
      level: "warning",
      message: 'Poster non trouvé pour la collection "Documentaires Nature"',
      library: "Documentaires",
      collection: "Documentaires Nature",
    },
  ]

  return NextResponse.json({ logs })
}
