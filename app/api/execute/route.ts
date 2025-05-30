import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import { promises as fs } from "fs"

async function executeKometaScript() {
  return new Promise((resolve, reject) => {
    // Assurez-vous que ce chemin est correct par rapport à la racine de votre projet DÉPLOYÉ
    const scriptPath = path.join(process.cwd(), "scripts", "jellyfin_kometa.py")
    // Le fichier de configuration sera dans le répertoire 'config' à la racine du projet déployé
    const configPath = path.join(process.cwd(), "config", "jellyfin_config.yaml")

    // Vérifier que le script existe au chemin attendu
    fs.access(scriptPath).catch(() => {
      console.error(`Script Kometa non trouvé à: ${scriptPath}`)
      reject(new Error(`Script Kometa non trouvé à: ${scriptPath}. Current working directory: ${process.cwd()}`))
      return
    })

    // Essayer 'python3' d'abord, ce qui devrait fonctionner si Nixpacks l'a mis dans le PATH
    // L'utilisation de /usr/bin/env est une bonne pratique pour la portabilité
    const pythonExecutable = "python3" // Ou "/usr/bin/env" avec "python3" comme premier argument

    const pythonProcess = spawn(pythonExecutable, [scriptPath, configPath], {
      cwd: process.cwd(), // Le répertoire de travail actuel de l'application Next.js
      env: {
        ...process.env, // Hériter de l'environnement du serveur Next.js
        // Nixpacks devrait gérer le PATH pour inclure Python
        JELLYFIN_URL: process.env.JELLYFIN_URL,
        JELLYFIN_API_KEY: process.env.JELLYFIN_API_KEY,
      },
    })

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString()
      console.log("Kometa stdout:", data.toString().trim())
    })

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString()
      console.error("Kometa stderr:", data.toString().trim())
    })

    pythonProcess.on("close", (code) => {
      if (code === 0) {
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
        reject(
          new Error(
            `Script Python terminé avec le code ${code}. Stderr: ${stderr || "Aucune sortie d'erreur."}. Stdout: ${stdout || "Aucune sortie standard."}`,
          ),
        )
      }
    })

    pythonProcess.on("error", (error) => {
      console.error("Erreur de spawn du processus Python:", error)
      reject(
        new Error(
          `Erreur lors du lancement du processus Python (${pythonExecutable}): ${error.message}. Assurez-vous que Python est installé et dans le PATH de l'environnement d'exécution.`,
        ),
      )
    })

    setTimeout(() => {
      if (!pythonProcess.killed) {
        pythonProcess.kill()
        reject(new Error("Timeout: exécution du script Python interrompue après 5 minutes"))
      }
    }, 300000)
  })
}

export async function POST() {
  try {
    console.log("Démarrage de l'exécution du script Kometa via l'API...")
    const result = await executeKometaScript()

    const logDir = path.join(process.cwd(), "logs")
    await fs
      .mkdir(logDir, { recursive: true })
      .catch((err) => console.warn("Impossible de créer le répertoire logs:", err)) // Gérer l'erreur si le répertoire existe déjà

    const logEntry = `[${new Date().toISOString()}] SUCCESS: ${result.message} - Collections: ${result.collectionsCreated}, Items: ${result.itemsProcessed}\n`
    await fs
      .appendFile(path.join(logDir, "kometa.log"), logEntry)
      .catch((err) => console.warn("Impossible d'écrire dans kometa.log:", err))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erreur API /api/execute:", error)

    const logDir = path.join(process.cwd(), "logs")
    try {
      await fs
        .mkdir(logDir, { recursive: true })
        .catch((err) => console.warn("Impossible de créer le répertoire logs pour l'erreur:", err))
      const logEntry = `[${new Date().toISOString()}] ERROR: ${error.message}\n`
      await fs
        .appendFile(path.join(logDir, "kometa.log"), logEntry)
        .catch((err) => console.warn("Impossible d'écrire l'erreur dans kometa.log:", err))
    } catch (logError) {
      console.error("Erreur critique lors de l'écriture des logs d'erreur:", logError)
    }

    return NextResponse.json({ error: error.message || "Erreur lors de l'exécution du script" }, { status: 500 })
  }
}
