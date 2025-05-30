import { NextResponse } from "next/server"

export async function GET() {
  // Simulation de données - remplacer par de vraies données
  const dashboardData = {
    libraries: [
      {
        name: "Films",
        totalItems: 1247,
        collections: 12,
        lastUpdate: "2024-01-15 14:30",
        status: "success",
      },
      {
        name: "Séries TV",
        totalItems: 89,
        collections: 8,
        lastUpdate: "2024-01-15 14:25",
        status: "success",
      },
      {
        name: "Documentaires",
        totalItems: 156,
        collections: 3,
        lastUpdate: "2024-01-15 14:20",
        status: "idle",
      },
    ],
    recentLogs: [
      {
        id: "1",
        timestamp: "14:30:15",
        type: "success",
        message: 'Collection "Films Marvel" créée avec 23 éléments',
        library: "Films",
      },
      {
        id: "2",
        timestamp: "14:29:45",
        type: "info",
        message: "Traitement de la bibliothèque Films en cours...",
        library: "Films",
      },
    ],
  }

  return NextResponse.json(dashboardData)
}
