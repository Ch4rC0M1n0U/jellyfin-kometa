import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Vérifier la connexion à Jellyfin
    const jellyfinUrl = process.env.JELLYFIN_URL || "http://localhost:8096"
    const apiKey = process.env.JELLYFIN_API_KEY

    let jellyfinStatus = "disconnected"

    if (apiKey) {
      try {
        const response = await fetch(`${jellyfinUrl}/System/Info`, {
          headers: {
            "X-Emby-Token": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        })

        if (response.ok) {
          jellyfinStatus = "connected"
        }
      } catch (error) {
        console.error("Health check Jellyfin failed:", error)
      }
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        jellyfin: jellyfinStatus,
        api: "healthy",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 500 },
    )
  }
}
