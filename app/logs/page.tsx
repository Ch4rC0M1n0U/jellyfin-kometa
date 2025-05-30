"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
} from "lucide-react"

interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "success" | "error" | "warning" | "debug"
  message: string
  library?: string
  collection?: string
  details?: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [libraryFilter, setLibraryFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, levelFilter, libraryFilter])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/logs")
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || demoLogs)
      } else {
        setLogs(demoLogs)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des logs:", error)
      setLogs(demoLogs)
    } finally {
      setIsLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = logs

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.library?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.collection?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtre par niveau
    if (levelFilter !== "all") {
      filtered = filtered.filter((log) => log.level === levelFilter)
    }

    // Filtre par bibliothèque
    if (libraryFilter !== "all") {
      filtered = filtered.filter((log) => log.library === libraryFilter)
    }

    setFilteredLogs(filtered)
  }

  const exportLogs = () => {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${log.library ? ` (${log.library})` : ""}`,
      )
      .join("\n")

    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jellyfin-kometa-logs-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "debug":
        return <Activity className="h-4 w-4 text-gray-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "success":
        return "default"
      case "error":
        return "destructive"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  // Données de démonstration
  const demoLogs: LogEntry[] = [
    {
      id: "1",
      timestamp: "2024-01-15 14:30:15",
      level: "success",
      message: 'Collection "Films Marvel" créée avec succès',
      library: "Films",
      collection: "Films Marvel",
      details: "23 éléments ajoutés à la collection",
    },
    {
      id: "2",
      timestamp: "2024-01-15 14:30:10",
      level: "info",
      message: "Recherche des films Marvel en cours...",
      library: "Films",
    },
    {
      id: "3",
      timestamp: "2024-01-15 14:30:05",
      level: "success",
      message: 'Collection "Séries Netflix" mise à jour',
      library: "Séries TV",
      collection: "Séries Netflix",
      details: "5 nouveaux éléments ajoutés",
    },
    {
      id: "4",
      timestamp: "2024-01-15 14:29:58",
      level: "warning",
      message: 'Poster non trouvé pour la collection "Documentaires Nature"',
      library: "Documentaires",
      collection: "Documentaires Nature",
    },
    {
      id: "5",
      timestamp: "2024-01-15 14:29:45",
      level: "info",
      message: "Traitement de la bibliothèque Séries TV en cours...",
      library: "Séries TV",
    },
    {
      id: "6",
      timestamp: "2024-01-15 14:29:30",
      level: "success",
      message: "Connexion à Jellyfin établie avec succès",
    },
    {
      id: "7",
      timestamp: "2024-01-15 14:29:25",
      level: "info",
      message: "Démarrage de l'exécution du script Kometa",
    },
    {
      id: "8",
      timestamp: "2024-01-15 14:25:12",
      level: "error",
      message: "Échec de la connexion à l'API TMDB",
      details: "Timeout après 30 secondes",
    },
    {
      id: "9",
      timestamp: "2024-01-15 14:20:33",
      level: "debug",
      message: "Configuration chargée depuis jellyfin_config.yaml",
    },
    {
      id: "10",
      timestamp: "2024-01-15 14:15:45",
      level: "success",
      message: "Sauvegarde de la configuration terminée",
    },
  ]

  const uniqueLibraries = Array.from(new Set(logs.map((log) => log.library).filter(Boolean)))

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
            <h1 className="text-3xl font-bold">Logs d'Exécution</h1>
            <p className="text-muted-foreground">Historique détaillé des opérations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Niveau</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="error">Erreur</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bibliothèque</label>
              <Select value={libraryFilter} onValueChange={setLibraryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les bibliothèques</SelectItem>
                  {uniqueLibraries.map((library) => (
                    <SelectItem key={library} value={library!}>
                      {library}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {["success", "info", "warning", "error", "debug"].map((level) => {
          const count = filteredLogs.filter((log) => log.level === level).length
          return (
            <Card key={level}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{level}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  {getLogIcon(level)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Liste des logs */}
      <Card>
        <CardHeader>
          <CardTitle>Entrées de Log</CardTitle>
          <CardDescription>
            {filteredLogs.length} entrée(s) sur {logs.length} au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getLogIcon(log.level)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">{log.timestamp}</span>
                        <Badge variant={getLevelBadgeVariant(log.level)}>{log.level}</Badge>
                        {log.library && <Badge variant="outline">{log.library}</Badge>}
                        {log.collection && <Badge variant="secondary">{log.collection}</Badge>}
                      </div>
                      <p className="text-sm">{log.message}</p>
                      {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Aucun log trouvé avec les filtres actuels</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
