"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Save, TestTube, Plus, Trash2, ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react"
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
    jellyfin: {
      url: process.env.NEXT_PUBLIC_JELLYFIN_URL || "",
      api_key: "", // Ne pas exposer la clé API côté client
    },
    libraries: {},
    settings: {
      update_interval: 3600,
      create_missing_collections: true,
      update_posters: true,
      dry_run: false,
    },
  })
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [connectionInfo, setConnectionInfo] = useState<{ serverName?: string; version?: string }>({})
  const [yamlConfig, setYamlConfig] = useState("")
  const [activeTab, setActiveTab] = useState("jellyfin")
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
    // Test automatique de la connexion au chargement
    if (process.env.NEXT_PUBLIC_JELLYFIN_URL) {
      testConnectionAuto()
    }
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/config")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        setYamlConfig(JSON.stringify(data, null, 2))
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la configuration:", error)
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la configuration",
        variant: "destructive",
      })
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
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      })
    }
  }

  const testConnectionAuto = async () => {
    try {
      const response = await fetch("/api/jellyfin/test")
      const data = await response.json()

      if (data.connected) {
        setConnectionStatus("success")
        setConnectionInfo({
          serverName: data.serverName,
          version: data.version,
        })
      } else {
        setConnectionStatus("error")
      }
    } catch (error) {
      setConnectionStatus("error")
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

      const data = await response.json()

      if (response.ok && data.connected) {
        setConnectionStatus("success")
        setConnectionInfo({
          serverName: data.serverName,
          version: data.version,
        })
        toast({
          title: "Connexion réussie",
          description: `Connecté à ${data.serverName} (v${data.version})`,
        })
      } else {
        setConnectionStatus("error")
        toast({
          title: "Échec de la connexion",
          description: data.error || "Vérifiez l'URL et la clé API",
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
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getConnectionMessage = () => {
    switch (connectionStatus) {
      case "success":
        return connectionInfo.serverName
          ? `Connecté à ${connectionInfo.serverName} (v${connectionInfo.version})`
          : "Connexion réussie"
      case "error":
        return "Échec de la connexion"
      case "testing":
        return "Test en cours..."
      default:
        return "Non testé"
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

      {/* Statut de connexion global */}
      <Card
        className={
          connectionStatus === "success" ? "border-green-200" : connectionStatus === "error" ? "border-red-200" : ""
        }
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {getConnectionIcon()}
            <div>
              <p className="font-medium">Statut de connexion Jellyfin</p>
              <p className="text-sm text-muted-foreground">{getConnectionMessage()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <CardDescription>
                Configurez la connexion à votre serveur Jellyfin. L'URL est configurée via les variables
                d'environnement.
              </CardDescription>
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
                <p className="text-xs text-muted-foreground">
                  URL configurée via NEXT_PUBLIC_JELLYFIN_URL: {process.env.NEXT_PUBLIC_JELLYFIN_URL || "Non définie"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jellyfin-api-key">Clé API</Label>
                <Input
                  id="jellyfin-api-key"
                  type="password"
                  placeholder="Configurée via les variables d'environnement"
                  value={config.jellyfin.api_key}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      jellyfin: { ...prev.jellyfin, api_key: e.target.value },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  La clé API est configurée via JELLYFIN_API_KEY sur le serveur
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={testConnection} disabled={connectionStatus === "testing"}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Tester la connexion
                </Button>
                {getConnectionIcon()}
                <span
                  className={`text-sm ${
                    connectionStatus === "success"
                      ? "text-green-600"
                      : connectionStatus === "error"
                        ? "text-red-600"
                        : "text-yellow-600"
                  }`}
                >
                  {getConnectionMessage()}
                </span>
              </div>

              {connectionStatus === "success" && connectionInfo.serverName && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800">Informations du serveur</h4>
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p>
                      <strong>Nom:</strong> {connectionInfo.serverName}
                    </p>
                    <p>
                      <strong>Version:</strong> {connectionInfo.version}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration des bibliothèques */}
        <TabsContent value="libraries" className="space-y-4">
          {["Films", "Séries TV", "Documentaires", "Musique"].map((libraryName) => (
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
                        <Label>Plage d'années</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="1980"
                            value={collection.filters.year_range?.[0] || ""}
                            onChange={(e) => {
                              const start = e.target.value ? Number.parseInt(e.target.value) : undefined
                              const end = collection.filters.year_range?.[1]
                              updateCollection(libraryName, key, {
                                filters: {
                                  ...collection.filters,
                                  year_range: start && end ? [start, end] : undefined,
                                },
                              })
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="1989"
                            value={collection.filters.year_range?.[1] || ""}
                            onChange={(e) => {
                              const start = collection.filters.year_range?.[0]
                              const end = e.target.value ? Number.parseInt(e.target.value) : undefined
                              updateCollection(libraryName, key, {
                                filters: {
                                  ...collection.filters,
                                  year_range: start && end ? [start, end] : undefined,
                                },
                              })
                            }}
                          />
                        </div>
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
                <p className="text-xs text-muted-foreground">
                  Temps d'attente entre les exécutions automatiques (3600 = 1 heure)
                </p>
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
              <CardDescription>Visualisez la configuration au format JSON (lecture seule)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Configuration JSON..."
                value={JSON.stringify(config, null, 2)}
                readOnly
                className="min-h-[400px] font-mono"
              />
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => setYamlConfig(JSON.stringify(config, null, 2))}>
                  Actualiser
                </Button>
                <Button onClick={() => navigator.clipboard.writeText(JSON.stringify(config, null, 2))}>Copier</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
