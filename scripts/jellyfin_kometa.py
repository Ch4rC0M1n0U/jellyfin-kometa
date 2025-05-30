import logging
import sys
import os
from pathlib import Path
from jellyfin_api import JellyfinAPI  # Assurez-vous que ce module existe et est accessible

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/kometa.log', mode='a'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class JellyfinKometa:
    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.config = self.load_config() # Charge la config depuis YAML

        # Récupère l'URL et la clé API depuis les variables d'environnement si disponibles,
        # sinon utilise celles du fichier de config.
        jellyfin_url_env = os.getenv('JELLYFIN_URL')
        jellyfin_api_key_env = os.getenv('JELLYFIN_API_KEY')

        jellyfin_url_config = self.config.get('jellyfin', {}).get('url')
        jellyfin_api_key_config = self.config.get('jellyfin', {}).get('api_key')

        final_jellyfin_url = jellyfin_url_env if jellyfin_url_env else jellyfin_url_config
        final_jellyfin_api_key = jellyfin_api_key_env if jellyfin_api_key_env else jellyfin_api_key_config

        if not final_jellyfin_url or not final_jellyfin_api_key:
            logger.error("URL ou clé API Jellyfin manquante. Vérifiez la configuration YAML ou les variables d'environnement JELLYFIN_URL/JELLYFIN_API_KEY.")
            # Vous pourriez vouloir lever une exception ici ou gérer l'erreur autrement
            # Pour l'instant, on continue pour que le reste du script puisse logger.
            self.jellyfin = None # Empêche les appels API si la config est mauvaise
        else:
            logger.info(f"Utilisation de l'URL Jellyfin: {final_jellyfin_url}")
            # Ne logguez PAS la clé API
            self.jellyfin = JellyfinAPI(
                final_jellyfin_url,
                final_jellyfin_api_key
            )
        
        self.libraries = {}
        if self.jellyfin: # Charge les bibliothèques seulement si JellyfinAPI est initialisé
            self.load_libraries()
        else:
            logger.warning("Initialisation de JellyfinAPI échouée, impossible de charger les bibliothèques.")

    def load_config(self):
        """Charge la configuration depuis le fichier YAML."""
        # Implémentez la logique de chargement de la configuration ici
        # Exemple (nécessite l'installation de PyYAML):
        # import yaml
        # with open(self.config_path, 'r') as f:
        #     return yaml.safe_load(f)
        # Pour l'instant, on retourne un dictionnaire vide pour éviter les erreurs.
        return {}

    def load_libraries(self):
        """Charge les bibliothèques depuis Jellyfin."""
        # Implémentez la logique de chargement des bibliothèques ici
        # Exemple:
        # self.libraries = self.jellyfin.get_libraries()
        # Pour l'instant, on laisse vide.
        pass

    def create_collections(self):
        """Crée les collections dans Jellyfin."""
        # Implémentez la logique de création des collections ici
        pass

    def update_metadata(self):
        """Met à jour les métadonnées dans Jellyfin."""
        # Implémentez la logique de mise à jour des métadonnées ici
        pass

    def run(self):
        """Lance le processus principal"""
        logger.info("=== Jellyfin Kometa - Gestionnaire de Collections ===")
        logger.info(f"Chemin de configuration: {self.config_path}")
        
        if not self.jellyfin:
            logger.error("JellyfinAPI non initialisé. Vérifiez la configuration et les logs précédents.")
            return

        logger.info(f"Serveur Jellyfin (depuis l'instance API): {self.jellyfin.server_url}")
        
        try:
            # Teste la connexion (déjà fait implicitement par load_libraries si self.jellyfin est ok)
            if not self.libraries: # Si load_libraries n'a rien chargé
                 # Essayer de recharger au cas où, ou vérifier le statut
                self.load_libraries() # Peut-être redondant si __init__ a réussi
                if not self.libraries:
                    logger.error("Erreur: Impossible de se connecter à Jellyfin ou aucune bibliothèque trouvée après tentative de chargement.")
                    return
            
            logger.info(f"Connexion réussie! {len(self.libraries)} bibliothèques trouvées: {list(self.libraries.keys())}")
            
            # Crée les collections
            self.create_collections()
            
            # Met à jour les métadonnées
            self.update_metadata()
            
            logger.info("\n=== Traitement terminé ===")
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement: {e}", exc_info=True) # Ajout de exc_info pour la stack trace
