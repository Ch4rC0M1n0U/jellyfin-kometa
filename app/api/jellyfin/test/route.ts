import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  const jellyfinUrl = process.env.JELLYFIN_URL || "http://localhost:8096"
  const apiKey = process.env.JELLYFIN_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "JELLYFIN_API_KEY non configurée" }, { status: 400 })
  }

  try {
    const response = await fetch(`${jellyfinUrl}/System/Info`, {
      headers: {
        "X-Emby-Token": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    })

    if (response.ok) {
      const systemInfo = await response.json()
      return NextResponse.json({
        connected: true,
        serverName: systemInfo.ServerName,
        version: systemInfo.Version,
      })
    } else {
      return NextResponse.json(
        {
          connected: false,
          error: `HTTP ${response.status}`,
        },
        { status: response.status },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, api_key } = await request.json()

    if (!url || !api_key) {
      return NextResponse.json({ error: "URL et clé API requis" }, { status: 400 })
    }

    const cleanUrl = url.replace(/\/+$/, "") // Supprime les slashes finaux

    const response = await fetch(`${cleanUrl}/System/Info`, {
      headers: {
        "X-Emby-Token": api_key,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    })

    if (response.ok) {
      const systemInfo = await response.json()
      return NextResponse.json({
        connected: true,
        serverName: systemInfo.ServerName,
        version: systemInfo.Version,
      })
    } else {
      return NextResponse.json(
        {
          connected: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        },
        { status: response.status },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: `Erreur de connexion: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
