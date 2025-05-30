import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), "logs", "kometa.log")
    const logs = []

    try {
      const logContent = await fs.readFile(logPath, "utf8")
      const logLines = logContent.split("\n").filter((line) => line.trim())

      logLines.forEach((line, index) => {
        if (line.trim()) {
          // Parser le format de log: [timestamp] LEVEL: message
          const match = line.match(/^\[([^\]]+)\]\s+(\w+):\s+(.+)$/)

          if (match) {
            const [, timestamp, level, message] = match

            logs.push({
              id: `log_${index}`,
              timestamp: new Date(timestamp).toLocaleString("fr-FR"),
              level: level.toLowerCase(),
              message: message,
              library: message.includes("Films")
                ? "Films"
                : message.includes("Séries")
                  ? "Séries TV"
                  : message.includes("Documentaires")
                    ? "Documentaires"
                    : undefined,
              collection: extractCollectionName(message),
            })
          } else {
            // Format de log non standard
            logs.push({
              id: `log_${index}`,
              timestamp: new Date().toLocaleString("fr-FR"),
              level: "info",
              message: line,
              library: undefined,
              collection: undefined,
            })
          }
        }
      })
    } catch (fileError) {
      // Si le fichier de log n'existe pas encore
      console.log("Fichier de log non trouvé, création en cours...")

      // Créer le répertoire de logs s'il n'existe pas
      const logDir = path.dirname(logPath)
      await fs.mkdir(logDir, { recursive: true })

      // Créer un fichier de log vide
      await fs.writeFile(logPath, "", "utf8")
    }

    return NextResponse.json({ logs: logs.reverse() }) // Plus récents en premier
  } catch (error) {
    console.error("Erreur lors de la lecture des logs:", error)
    return NextResponse.json({ error: "Erreur lors de la lecture des logs", logs: [] }, { status: 500 })
  }
}

function extractCollectionName(message: string): string | undefined {
  // Extraire le nom de collection depuis le message
  const collectionMatch = message.match(/Collection\s+"([^"]+)"/i) || message.match(/collection\s+([^\s]+)/i)

  return collectionMatch ? collectionMatch[1] : undefined
}
