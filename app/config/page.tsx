"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Save, TestTube, Plus, Trash2, ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JellyfinConfig {
  url: string
  api_key: string
}

interface CollectionFilter {
  genre?: string
  year?: number
  year_range?: [number, number]
  studio?: string
  network?: string
  imdb_rating?: number
}

interface Collection {
  name: string
  filters: CollectionFilter
  poster?: string
}

interface LibraryConfig {
  collections: Record<string, Collection>
}

interface Config {
  jellyfin: JellyfinConfig
  libraries: Record<string, LibraryConfig>
  settings: {
    update_interval: number
    create_missing_collections: boolean
    update_posters: boolean
    dry_run: boolean
  }
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>({
    jellyfin: { url: "", api_key: "" },
    libraries: {},
    settings: {
      update_interval: 3600,
      create_missing_collections: true,
      update_posters: true,
      dry_run: false,
    },
  })
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [yamlConfig, setYamlConfig] = useState("")
  const [activeTab, setActiveTab] = useState("jellyfin")
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/config")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        setYamlConfig(data.yaml || "")
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la configuration:", error)
    }
  }

  const saveConfig = async () => {
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        toast({
          title: "Configuration sauvegardée",
          description: "Les paramètres ont été mis à jour avec succès",
        })
      } else {
        throw new Error("Erreur lors de la sauvegarde")
      }
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      })
    }
  }

  const testConnection = async () => {
    setConnectionStatus("testing")
    try {
      const response = await fetch("/api/jellyfin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.jellyfin),
      })

      setConnectionStatus(response.ok ? "success" : "error")

      if (response.ok) {
        toast({
          title: "Connexion réussie",
          description: "La connexion à Jellyfin a été établie",
        })
      } else {
        toast({
          title: "Échec de la connexion",
          description: "Vérifiez l'URL et la clé API",
          variant: "destructive",
        })
      }
    } catch (error) {
      setConnectionStatus("error")
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au serveur",
        variant: "destructive",
      })
    }
  }

  const addCollection = (libraryName: string) => {
    const newCollection: Collection = {
      name: "Nouvelle Collection",
      filters: {},
    }

    setConfig((prev) => ({
      ...prev,
      libraries: {
        ...prev.libraries,
        [libraryName]: {
          ...prev.libraries[libraryName],
          collections: {
            ...prev.libraries[libraryName]?.collections,
            [`collection_${Date.now()}`]: newCollection,
          },
        },
      },
    }))
  }

  const removeCollection = (libraryName: string, collectionKey: string) => {
    setConfig((prev) => {
      const newLibraries = { ...prev.libraries }
      if (newLibraries[libraryName]) {
        const { [collectionKey]: removed, ...rest } = newLibraries[libraryName].collections
        newLibraries[libraryName] = { ...newLibraries[libraryName], collections: rest }
      }
      return { ...prev, libraries: newLibraries }
    })
  }

  const updateCollection = (libraryName: string, collectionKey: string, updates: Partial<Collection>) => {
    setConfig((prev) => ({
      ...prev,
      libraries: {
        ...prev.libraries,
        [libraryName]: {
          ...prev.libraries[libraryName],
          collections: {
            ...prev.libraries[libraryName]?.collections,
            [collectionKey]: {
              ...prev.libraries[libraryName]?.collections[collectionKey],
              ...updates,
            },
          },
        },
      },
    }))
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "testing":
        return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <a href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </a>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configuration</h1>
            <p className="text-muted-foreground">Paramètres Jellyfin Kometa</p>
          </div>
        </div>
        <Button onClick={saveConfig}>
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jellyfin">Jellyfin</TabsTrigger>
          <TabsTrigger value="libraries">Bibliothèques</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        {/* Configuration Jellyfin */}
        <TabsContent value="jellyfin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connexion Jellyfin</CardTitle>
              <CardDescription>Configurez la connexion à votre serveur Jellyfin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jellyfin-url">URL du serveur</Label>
                <Input
                  id="jellyfin-url"
                  placeholder="http://localhost:8096"
                  value={config.jellyfin.url}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      jellyfin: { ...prev.jellyfin, url: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jellyfin-api-key">Clé API</Label>
                <Input
                  id="jellyfin-api-key"
                  type="password"
                  placeholder="Votre clé API Jellyfin"
                  value={config.jellyfin.api_key}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      jellyfin: { ...prev.jellyfin, api_key: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={testConnection} disabled={connectionStatus === "testing"}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Tester la connexion
                </Button>
                {getConnectionIcon()}
                {connectionStatus === "success" && <span className="text-sm text-green-600">Connexion réussie</span>}
                {connectionStatus === "error" && <span className="text-sm text-red-600">Échec de la connexion</span>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration des bibliothèques */}
        <TabsContent value="libraries" className="space-y-4">
          {["Films", "Séries TV", "Documentaires"].map((libraryName) => (
            <Card key={libraryName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{libraryName}</CardTitle>
                    <CardDescription>Collections pour la bibliothèque {libraryName}</CardDescription>
                  </div>
                  <Button onClick={() => addCollection(libraryName)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter Collection
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.libraries[libraryName]?.collections || {}).map(([key, collection]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Input
                        placeholder="Nom de la collection"
                        value={collection.name}
                        onChange={(e) => updateCollection(libraryName, key, { name: e.target.value })}
                        className="max-w-xs"
                      />
                      <Button variant="outline" size="sm" onClick={() => removeCollection(libraryName, key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Genre</Label>
                        <Input
                          placeholder="Action, Comédie..."
                          value={collection.filters.genre || ""}
                          onChange={(e) =>
                            updateCollection(libraryName, key, {
                              filters: { ...collection.filters, genre: e.target.value || undefined },
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Année</Label>
                        <Input
                          type="number"
                          placeholder="2023"
                          value={collection.filters.year || ""}
                          onChange={(e) =>
                            updateCollection(libraryName, key, {
                              filters: {
                                ...collection.filters,
                                year: e.target.value ? Number.parseInt(e.target.value) : undefined,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Note IMDb min</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="7.0"
                          value={collection.filters.imdb_rating || ""}
                          onChange={(e) =>
                            updateCollection(libraryName, key, {
                              filters: {
                                ...collection.filters,
                                imdb_rating: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Studio/Réseau</Label>
                        <Input
                          placeholder="Netflix, Marvel..."
                          value={collection.filters.studio || collection.filters.network || ""}
                          onChange={(e) =>
                            updateCollection(libraryName, key, {
                              filters: {
                                ...collection.filters,
                                studio: libraryName === "Films" ? e.target.value || undefined : undefined,
                                network: libraryName === "Séries TV" ? e.target.value || undefined : undefined,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>URL Poster</Label>
                        <Input
                          placeholder="https://..."
                          value={collection.poster || ""}
                          onChange={(e) =>
                            updateCollection(libraryName, key, {
                              poster: e.target.value || undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {Object.keys(config.libraries[libraryName]?.collections || {}).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune collection configurée pour cette bibliothèque
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Paramètres généraux */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Généraux</CardTitle>
              <CardDescription>Configuration du comportement du script</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="update-interval">Intervalle de mise à jour (secondes)</Label>
                <Input
                  id="update-interval"
                  type="number"
                  value={config.settings.update_interval}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, update_interval: Number.parseInt(e.target.value) || 3600 },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Créer les collections manquantes</Label>
                  <p className="text-sm text-muted-foreground">
                    Créer automatiquement les collections qui n'existent pas
                  </p>
                </div>
                <Switch
                  checked={config.settings.create_missing_collections}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, create_missing_collections: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mettre à jour les posters</Label>
                  <p className="text-sm text-muted-foreground">Télécharger et appliquer automatiquement les posters</p>
                </div>
                <Switch
                  checked={config.settings.update_posters}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, update_posters: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode test (Dry Run)</Label>
                  <p className="text-sm text-muted-foreground">Simuler les actions sans les appliquer réellement</p>
                </div>
                <Switch
                  checked={config.settings.dry_run}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, dry_run: checked },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Éditeur YAML */}
        <TabsContent value="yaml" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration YAML</CardTitle>
              <CardDescription>Éditez directement la configuration au format YAML</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Configuration YAML..."
                value={yamlConfig}
                onChange={(e) => setYamlConfig(e.target.value)}
                className="min-h-[400px] font-mono"
              />
              <div className="mt-4 flex gap-2">
                <Button variant="outline">Valider YAML</Button>
                <Button>Appliquer Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
