import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  // Test avec la configuration actuelle
  return NextResponse.json({ connected: true })
}

export async function POST(request: NextRequest) {
  try {
    const { url, api_key } = await request.json()

    // Simulation du test de connexion
    if (!url || !api_key) {
      return NextResponse.json({ error: "URL et clé API requis" }, { status: 400 })
    }

    // Ici, vous feriez un vrai appel à l'API Jellyfin
    // const response = await fetch(`${url}/System/Info`, {
    //   headers: { 'X-Emby-Token': api_key }
    // })

    // Simulation d'une connexion réussie
    return NextResponse.json({ connected: true })
  } catch (error) {
    return NextResponse.json({ error: "Erreur de connexion" }, { status: 500 })
  }
}
