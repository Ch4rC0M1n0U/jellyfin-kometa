"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Play,
  Pause,
  Settings,
  Activity,
  Database,
  Film,
  Tv,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LibraryStats {
  name: string
  totalItems: number
  collections: number
  lastUpdate: string
  status: "success" | "error" | "running" | "idle"
}

interface ExecutionLog {
  id: string
  timestamp: string
  type: "info" | "success" | "error" | "warning"
  message: string
  library?: string
}

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [libraries, setLibraries] = useState<LibraryStats[]>([])
  const [recentLogs, setRecentLogs] = useState<ExecutionLog[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking")
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    // Charger les données initiales
    loadDashboardData()
    checkJellyfinConnection()

    // Simuler des logs en temps réel
    const interval = setInterval(() => {
      if (isRunning) {
        setProgress((prev) => Math.min(prev + 10, 100))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  const loadDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard")
      if (response.ok) {
        const data = await response.json()
        setLibraries(data.libraries || [])
        setRecentLogs(data.recentLogs || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    }
  }

  const checkJellyfinConnection = async () => {
    setConnectionStatus("checking")
    try {
      const response = await fetch("/api/jellyfin/test")
      const data = await response.json()

      if (data.connected) {
        setConnectionStatus("connected")
        // Afficher les informations du serveur si disponibles
        if (data.serverName) {
          toast({
            title: "Connexion établie",
            description: `Connecté à ${data.serverName} (v${data.version})`,
          })
        }
      } else {
        setConnectionStatus("disconnected")
      }
    } catch (error) {
      setConnectionStatus("disconnected")
      console.error("Erreur de connexion:", error)
    }
  }

  const executeScript = async () => {
    setIsRunning(true)
    setProgress(0)

    try {
      const response = await fetch("/api/execute", { method: "POST" })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Exécution terminée",
          description: "Le script a été exécuté avec succès",
        })
        loadDashboardData()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Erreur d'exécution",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
      setProgress(0)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  // Données de démonstration
  // const demoLibraries: LibraryStats[] = [
  //   {
  //     name: "Films",
  //     totalItems: 1247,
  //     collections: 12,
  //     lastUpdate: "2024-01-15 14:30",
  //     status: "success",
  //   },
  //   {
  //     name: "Séries TV",
  //     totalItems: 89,
  //     collections: 8,
  //     lastUpdate: "2024-01-15 14:25",
  //     status: "success",
  //   },
  //   {
  //     name: "Documentaires",
  //     totalItems: 156,
  //     collections: 3,
  //     lastUpdate: "2024-01-15 14:20",
  //     status: "idle",
  //   },
  // ]

  // const demoLogs: ExecutionLog[] = [
  //   {
  //     id: "1",
  //     timestamp: "14:30:15",
  //     type: "success",
  //     message: 'Collection "Films Marvel" créée avec 23 éléments',
  //     library: "Films",
  //   },
  //   {
  //     id: "2",
  //     timestamp: "14:29:45",
  //     type: "info",
  //     message: "Traitement de la bibliothèque Films en cours...",
  //     library: "Films",
  //   },
  //   {
  //     id: "3",
  //     timestamp: "14:29:30",
  //     type: "success",
  //     message: "Connexion à Jellyfin établie",
  //   },
  //   {
  //     id: "4",
  //     timestamp: "14:29:00",
  //     type: "info",
  //     message: "Démarrage de l'exécution du script",
  //   },
  // ]

  const displayLibraries = libraries
  const displayLogs = recentLogs

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jellyfin Kometa Dashboard</h1>
          <p className="text-muted-foreground">Gestionnaire de collections et métadonnées</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={connectionStatus === "connected" ? "default" : "destructive"}>
            <Database className="h-3 w-3 mr-1" />
            {connectionStatus === "connected" ? "Connecté" : "Déconnecté"}
          </Badge>
          <Button onClick={executeScript} disabled={isRunning}>
            {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isRunning ? "En cours..." : "Exécuter"}
          </Button>
          <Button variant="outline" asChild>
            <a href="/config">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </a>
          </Button>
        </div>
      </div>

      {/* Barre de progression */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exécution en cours...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Films</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayLibraries.find((l) => l.name === "Films")?.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {displayLibraries.find((l) => l.name === "Films")?.collections || 0} collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Séries</CardTitle>
            <Tv className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayLibraries.find((l) => l.name === "Séries TV")?.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {displayLibraries.find((l) => l.name === "Séries TV")?.collections || 0} collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections Totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayLibraries.reduce((sum, lib) => sum + lib.collections, 0)}</div>
            <p className="text-xs text-muted-foreground">
              Dernière mise à jour: {displayLibraries[0]?.lastUpdate || "Jamais"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <Tabs defaultValue="libraries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="libraries">Bibliothèques</TabsTrigger>
          <TabsTrigger value="logs">Logs Récents</TabsTrigger>
        </TabsList>

        <TabsContent value="libraries" className="space-y-4">
          <div className="grid gap-4">
            {displayLibraries.map((library) => (
              <Card key={library.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(library.status)}
                        {library.name}
                      </CardTitle>
                      <CardDescription>
                        {library.totalItems} éléments • {library.collections} collections
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Dernière mise à jour: {library.lastUpdate}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Éléments:</span>
                      <div className="text-2xl font-bold">{library.totalItems}</div>
                    </div>
                    <div>
                      <span className="font-medium">Collections:</span>
                      <div className="text-2xl font-bold">{library.collections}</div>
                    </div>
                    <div>
                      <span className="font-medium">Statut:</span>
                      <div className="flex items-center gap-1 mt-1">
                        {getStatusIcon(library.status)}
                        <span className="capitalize">{library.status}</span>
                      </div>
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs d'Exécution</CardTitle>
              <CardDescription>Historique des dernières opérations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    {getLogIcon(log.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{log.timestamp}</span>
                        {log.library && (
                          <Badge variant="outline" className="text-xs">
                            {log.library}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
