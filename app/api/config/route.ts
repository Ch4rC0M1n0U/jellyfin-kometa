import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données de configuration
let configData = {
  jellyfin: {
    url: "http://localhost:8096",
    api_key: "",
  },
  libraries: {
    Films: {
      collections: {
        marvel: {
          name: "Films Marvel",
          filters: {
            genre: "Action",
            studio: "Marvel Studios",
          },
        },
      },
    },
  },
  settings: {
    update_interval: 3600,
    create_missing_collections: true,
    update_posters: true,
    dry_run: false,
  },
}

export async function GET() {
  return NextResponse.json(configData)
}

export async function POST(request: NextRequest) {
  try {
    const newConfig = await request.json()
    configData = { ...configData, ...newConfig }

    // Ici, vous sauvegarderiez la configuration dans un fichier ou une base de données
    console.log("Configuration sauvegardée:", configData)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 })
  }
}
