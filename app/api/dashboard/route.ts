import { NextResponse } from "next/server"

async function getJellyfinData() {
  const jellyfinUrl = process.env.JELLYFIN_URL || "http://localhost:8096"
  const apiKey = process.env.JELLYFIN_API_KEY

  if (!apiKey) {
    throw new Error("JELLYFIN_API_KEY non configurée")
  }

  try {
    // Récupérer les utilisateurs pour obtenir un ID utilisateur
    const usersResponse = await fetch(`${jellyfinUrl}/Users`, {
      headers: {
        "X-Emby-Token": apiKey,
        "Content-Type": "application/json",
      },
    })

    if (!usersResponse.ok) {
      throw new Error("Impossible de récupérer les utilisateurs Jellyfin")
    }

    const users = await usersResponse.json()
    if (!users || users.length === 0) {
      throw new Error("Aucun utilisateur trouvé")
    }

    const userId = users[0].Id

    // Récupérer les bibliothèques
    const librariesResponse = await fetch(`${jellyfinUrl}/Users/${userId}/Views`, {
      headers: {
        "X-Emby-Token": apiKey,
        "Content-Type": "application/json",
      },
    })

    if (!librariesResponse.ok) {
      throw new Error("Impossible de récupérer les bibliothèques")
    }

    const librariesData = await librariesResponse.json()
    const libraries = []

    // Pour chaque bibliothèque, récupérer les statistiques
    for (const library of librariesData.Items) {
      try {
        // Récupérer les éléments de la bibliothèque
        const itemsResponse = await fetch(`${jellyfinUrl}/Items?ParentId=${library.Id}&Recursive=true`, {
          headers: {
            "X-Emby-Token": apiKey,
            "Content-Type": "application/json",
          },
        })

        // Récupérer les collections
        const collectionsResponse = await fetch(
          `${jellyfinUrl}/Items?ParentId=${library.Id}&IncludeItemTypes=BoxSet&Recursive=true`,
          {
            headers: {
              "X-Emby-Token": apiKey,
              "Content-Type": "application/json",
            },
          },
        )

        const itemsData = itemsResponse.ok ? await itemsResponse.json() : { Items: [] }
        const collectionsData = collectionsResponse.ok ? await collectionsResponse.json() : { Items: [] }

        libraries.push({
          name: library.Name,
          totalItems: itemsData.Items?.length || 0,
          collections: collectionsData.Items?.length || 0,
          lastUpdate: new Date().toLocaleString("fr-FR"),
          status: "success",
        })
      } catch (error) {
        console.error(`Erreur pour la bibliothèque ${library.Name}:`, error)
        libraries.push({
          name: library.Name,
          totalItems: 0,
          collections: 0,
          lastUpdate: "Erreur",
          status: "error",
        })
      }
    }

    return { libraries }
  } catch (error) {
    console.error("Erreur lors de la récupération des données Jellyfin:", error)
    throw error
  }
}

export async function GET() {
  try {
    const data = await getJellyfinData()

    // Récupérer les logs récents depuis le fichier
    const recentLogs = []
    try {
      const fs = require("fs")
      const path = require("path")
      const logPath = path.join(process.cwd(), "logs", "kometa.log")

      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, "utf8")
        const logLines = logContent.split("\n").filter((line) => line.trim())

        // Prendre les 10 dernières lignes
        const recentLines = logLines.slice(-10)
        recentLines.forEach((line, index) => {
          const timestamp = new Date().toLocaleTimeString("fr-FR")
          recentLogs.push({
            id: `log_${index}`,
            timestamp,
            type: line.includes("ERROR") ? "error" : line.includes("SUCCESS") ? "success" : "info",
            message: line,
            library: line.includes("Films") ? "Films" : line.includes("Séries") ? "Séries TV" : undefined,
          })
        })
      }
    } catch (logError) {
      console.error("Erreur lors de la lecture des logs:", logError)
    }

    return NextResponse.json({
      ...data,
      recentLogs,
    })
  } catch (error) {
    console.error("Erreur API dashboard:", error)
    return NextResponse.json({ error: error.message || "Erreur lors de la récupération des données" }, { status: 500 })
  }
}
