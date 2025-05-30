import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import { promises as fs } from "fs"

async function executeKometaScript() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "jellyfin_kometa.py")
    const configPath = path.join(process.cwd(), "config", "jellyfin_config.yaml")

    // Vérifier que le script existe
    fs.access(scriptPath).catch(() => {
      reject(new Error("Script Kometa non trouvé"))
      return
    })

    const pythonProcess = spawn("python3", [scriptPath, configPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JELLYFIN_URL: process.env.JELLYFIN_URL,
        JELLYFIN_API_KEY: process.env.JELLYFIN_API_KEY,
      },
    })

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString()
      console.log("Kometa stdout:", data.toString())
    })

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString()
      console.error("Kometa stderr:", data.toString())
    })

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        // Analyser la sortie pour extraire les statistiques
        const collectionsCreated = (stdout.match(/Collection.*créée/g) || []).length
        const itemsProcessed = (stdout.match(/éléments? (trouvés?|ajoutés?)/g) || []).length

        resolve({
          success: true,
          message: "Script exécuté avec succès",
          collectionsCreated,
          itemsProcessed,
          output: stdout,
        })
      } else {
        reject(new Error(`Script terminé avec le code ${code}: ${stderr}`))
      }
    })

    pythonProcess.on("error", (error) => {
      reject(new Error(`Erreur lors de l'exécution: ${error.message}`))
    })

    // Timeout après 5 minutes
    setTimeout(() => {
      pythonProcess.kill()
      reject(new Error("Timeout: exécution interrompue après 5 minutes"))
    }, 300000)
  })
}

export async function POST() {
  try {
    console.log("Démarrage de l'exécution du script Kometa...")

    const result = await executeKometaScript()

    // Enregistrer le log d'exécution
    const logDir = path.join(process.cwd(), "logs")
    await fs.mkdir(logDir, { recursive: true })

    const logEntry = `[${new Date().toISOString()}] SUCCESS: ${result.message} - Collections: ${result.collectionsCreated}, Items: ${result.itemsProcessed}\n`
    await fs.appendFile(path.join(logDir, "kometa.log"), logEntry)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erreur lors de l'exécution du script:", error)

    // Enregistrer l'erreur dans les logs
    try {
      const logDir = path.join(process.cwd(), "logs")
      await fs.mkdir(logDir, { recursive: true })

      const logEntry = `[${new Date().toISOString()}] ERROR: ${error.message}\n`
      await fs.appendFile(path.join(logDir, "kometa.log"), logEntry)
    } catch (logError) {
      console.error("Erreur lors de l'écriture des logs:", logError)
    }

    return NextResponse.json({ error: error.message || "Erreur lors de l'exécution du script" }, { status: 500 })
  }
}
