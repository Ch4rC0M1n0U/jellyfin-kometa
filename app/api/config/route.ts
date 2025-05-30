import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import yaml from "js-yaml"

const CONFIG_PATH = path.join(process.cwd(), "config", "jellyfin_config.yaml")

async function ensureConfigDirectory() {
  const configDir = path.dirname(CONFIG_PATH)
  try {
    await fs.access(configDir)
  } catch {
    await fs.mkdir(configDir, { recursive: true })
  }
}

async function loadConfig() {
  try {
    await ensureConfigDirectory()
    const configContent = await fs.readFile(CONFIG_PATH, "utf8")
    return yaml.load(configContent)
  } catch (error) {
    // Si le fichier n'existe pas, créer une configuration par défaut
    const defaultConfig = {
      jellyfin: {
        url: process.env.JELLYFIN_URL || "http://localhost:8096",
        api_key: process.env.JELLYFIN_API_KEY || "",
      },
      libraries: {
        Films: {
          collections: {
            "Films Marvel": {
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

    await saveConfig(defaultConfig)
    return defaultConfig
  }
}

async function saveConfig(config) {
  await ensureConfigDirectory()
  const yamlContent = yaml.dump(config, {
    defaultFlowStyle: false,
    lineWidth: -1,
  })
  await fs.writeFile(CONFIG_PATH, yamlContent, "utf8")
}

export async function GET() {
  try {
    const config = await loadConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Erreur lors du chargement de la configuration:", error)
    return NextResponse.json({ error: "Erreur lors du chargement de la configuration" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const newConfig = await request.json()
    await saveConfig(newConfig)

    console.log("Configuration sauvegardée:", CONFIG_PATH)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error)
    return NextResponse.json({ error: "Erreur lors de la sauvegarde de la configuration" }, { status: 500 })
  }
}
