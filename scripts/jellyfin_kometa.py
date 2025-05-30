import logging
import sys
import os
import yaml
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional

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

class JellyfinAPI:
    def __init__(self, server_url: str, api_key: str):
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            'X-Emby-Token': api_key,
            'Content-Type': 'application/json'
        }
        logger.info(f"JellyfinAPI initialisée pour {self.server_url}")

    def _request(self, method: str, endpoint: str, params: Optional[Dict] = None, json_data: Optional[Dict] = None) -> Optional[Any]:
        url = f"{self.server_url}{endpoint}"
        try:
            response = requests.request(method, url, headers=self.headers, params=params, json=json_data, timeout=30)
            response.raise_for_status()
            if response.status_code == 204:
                return None
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur API Jellyfin ({method} {url}): {e}")
            return None

    def get_system_info(self) -> Optional[Dict]:
        return self._request("GET", "/System/Info")

    def get_users(self) -> Optional[List[Dict]]:
        return self._request("GET", "/Users")

    def get_libraries(self, user_id: str) -> Optional[List[Dict]]:
        data = self._request("GET", f"/Users/{user_id}/Views")
        return data.get('Items') if data else None
        
    def get_items(self, library_id: str, item_type: Optional[str] = None, filters: Optional[Dict] = None, fields: Optional[str] = None) -> List[Dict]:
        params = {
            'ParentId': library_id,
            'Recursive': 'true',
            'Fields': fields if fields else 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,Tags,Studios,OfficialRating,CommunityRating'
        }
        if item_type:
            params['IncludeItemTypes'] = item_type
        if filters:
            params.update(filters)
        
        data = self._request("GET", "/Items", params=params)
        return data.get('Items', []) if data else []

    def create_collection(self, name: str, item_ids: List[str], library_id: Optional[str] = None) -> Optional[str]:
        parent_id_to_use = library_id

        payload = {'Name': name, 'Ids': ",".join(item_ids)}
        if parent_id_to_use:
             payload['ParentId'] = parent_id_to_use
        
        data = self._request("POST", "/Collections", json_data=payload)
        return data.get('Id') if data else None

    def get_collections(self, library_id: Optional[str] = None) -> List[Dict]:
        if library_id:
            return self.get_items(library_id, item_type='BoxSet')
        else:
            logger.warning("Récupération des collections globales non implémentée en détail, retour des collections de la première bibliothèque.")
            users = self.get_users()
            if users:
                user_id = users[0]['Id']
                libraries = self.get_libraries(user_id)
                if libraries:
                    return self.get_items(libraries[0]['Id'], item_type='BoxSet')
            return []

    def add_to_collection(self, collection_id: str, item_ids: List[str]) -> bool:
        response = self._request("POST", f"/Collections/{collection_id}/Items", params={'Ids': ",".join(item_ids)})
        return response is None

    def update_item_metadata(self, item_id: str, metadata: Dict) -> bool:
        response = self._request("POST", f"/Items/{item_id}", json_data=metadata)
        return response is None

class JellyfinKometa:
    def __init__(self, config_path_str: str):
        self.config_path = Path(config_path_str)
        self.config: Dict = {}
        self._load_config_data()

        jellyfin_url_env = os.getenv('JELLYFIN_URL')
        jellyfin_api_key_env = os.getenv('JELLYFIN_API_KEY')

        jellyfin_url_config = self.config.get('jellyfin', {}).get('url')
        jellyfin_api_key_config = self.config.get('jellyfin', {}).get('api_key')

        final_jellyfin_url = jellyfin_url_env if jellyfin_url_env else jellyfin_url_config
        final_jellyfin_api_key = jellyfin_api_key_env if jellyfin_api_key_env else jellyfin_api_key_config

        if not final_jellyfin_url or not final_jellyfin_api_key:
            logger.error("URL ou clé API Jellyfin manquante. Vérifiez la configuration YAML ou les variables d'environnement JELLYFIN_URL/JELLYFIN_API_KEY.")
            self.jellyfin: Optional[JellyfinAPI] = None
        else:
            logger.info(f"Utilisation de l'URL Jellyfin: {final_jellyfin_url}")
            self.jellyfin = JellyfinAPI(final_jellyfin_url, final_jellyfin_api_key)
        
        self.user_id: Optional[str] = None
        self.libraries_map: Dict[str, str] = {}
        
        if self.jellyfin:
            self._initialize_jellyfin_session_data()
        else:
            logger.warning("Initialisation de JellyfinAPI échouée, impossible de charger les données de session.")

    def _load_config_data(self):
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as file:
                    self.config = yaml.safe_load(file)
                    if self.config is None:
                        self.config = {}
                    logger.info(f"Configuration chargée depuis {self.config_path}")
            else:
                logger.warning(f"Fichier de configuration non trouvé à {self.config_path}. Utilisation d'une configuration vide.")
                self.config = {}
        except yaml.YAMLError as e:
            logger.error(f"Erreur lors du parsing du fichier YAML de configuration {self.config_path}: {e}")
            self.config = {}
        except Exception as e:
            logger.error(f"Erreur inattendue lors du chargement de la configuration {self.config_path}: {e}")
            self.config = {}

    def _initialize_jellyfin_session_data(self):
        if not self.jellyfin: return

        users = self.jellyfin.get_users()
        if users and len(users) > 0:
            self.user_id = users[0]['Id']
            logger.info(f"ID utilisateur récupéré: {self.user_id}")
            
            jellyfin_libs = self.jellyfin.get_libraries(self.user_id)
            if jellyfin_libs:
                for lib in jellyfin_libs:
                    self.libraries_map[lib['Name']] = lib['Id']
                logger.info(f"Bibliothèques Jellyfin chargées: {list(self.libraries_map.keys())}")
            else:
                logger.warning("Aucune bibliothèque Jellyfin trouvée pour cet utilisateur.")
        else:
            logger.warning("Aucun utilisateur Jellyfin trouvé. Impossible de récupérer les bibliothèques.")

    def _filter_items(self, items: List[Dict], filters: Dict) -> List[Dict]:
        filtered_items = []
        for item in items:
            match = True
            for key, value in filters.items():
                if key == 'genre':
                    item_genres = [g['Name'].lower() for g in item.get('Genres', [])]
                    if str(value).lower() not in item_genres:
                        match = False; break
                elif key == 'year':
                    if item.get('ProductionYear') != value:
                        match = False; break
                elif key == 'year_range':
                    item_year = item.get('ProductionYear')
                    if not (item_year and value[0] <= item_year <= value[1]):
                        match = False; break
                elif key == 'studio':
                    item_studios = [s['Name'].lower() for s in item.get('Studios', [])]
                    if str(value).lower() not in item_studios:
                        match = False; break
                elif key == 'network':
                    item_studios = [s['Name'].lower() for s in item.get('Studios', [])]
                    if str(value).lower() not in item_studios:
                        match = False; break
                elif key == 'imdb_rating':
                    if item.get('CommunityRating', 0) < value:
                        match = False; break
                else:
                    logger.warning(f"Filtre inconnu '{key}' ignoré.")
            
            if match:
                filtered_items.append(item)
        return filtered_items

    def run(self):
        logger.info("=== Jellyfin Kometa - Démarrage du traitement ===")
        if not self.jellyfin or not self.user_id:
            logger.error("Jellyfin n'est pas correctement initialisé ou l'ID utilisateur est manquant. Arrêt.")
            return

        dry_run = self.config.get('settings', {}).get('dry_run', False)
        if dry_run:
            logger.info("MODE TEST (DRY RUN) ACTIVÉ: Aucune modification ne sera appliquée à Jellyfin.")

        configured_libraries = self.config.get('libraries', {})
        if not configured_libraries:
            logger.info("Aucune bibliothèque configurée dans le fichier YAML. Rien à faire.")
            return

        for lib_name_config, lib_config_data in configured_libraries.items():
            if lib_name_config not in self.libraries_map:
                logger.warning(f"Bibliothèque '{lib_name_config}' configurée dans YAML mais non trouvée dans Jellyfin. Ignorée.")
                continue
            
            jellyfin_lib_id = self.libraries_map[lib_name_config]
            logger.info(f"Traitement de la bibliothèque Jellyfin: '{lib_name_config}' (ID: {jellyfin_lib_id})")

            all_items_in_lib = self.jellyfin.get_items(jellyfin_lib_id)
            if not all_items_in_lib:
                logger.info(f"Aucun élément trouvé dans la bibliothèque '{lib_name_config}'.")
                continue
            logger.info(f"{len(all_items_in_lib)} éléments récupérés depuis '{lib_name_config}'.")

            existing_collections_in_lib = self.jellyfin.get_collections(jellyfin_lib_id)
            existing_collections_map = {col['Name']: col['Id'] for col in existing_collections_in_lib}
            logger.info(f"{len(existing_collections_map)} collections existantes trouvées dans '{lib_name_config}'.")

            for col_name_config, col_config_data in lib_config_data.get('collections', {}).items():
                logger.info(f"  Traitement de la collection configurée: '{col_name_config}'")
                filters = col_config_data.get('filters', {})
                if not filters:
                    logger.warning(f"  Collection '{col_name_config}' n'a pas de filtres. Ignorée.")
                    continue

                logger.info(f"    Filtres appliqués: {filters}")
                filtered_item_ids = [item['Id'] for item in self._filter_items(all_items_in_lib, filters)]

                if not filtered_item_ids:
                    logger.info(f"    Aucun élément ne correspond aux filtres pour '{col_name_config}'.")
                    continue
                
                logger.info(f"    {len(filtered_item_ids)} éléments correspondent pour '{col_name_config}'.")

                if col_name_config in existing_collections_map:
                    collection_id = existing_collections_map[col_name_config]
                    logger.info(f"    Collection '{col_name_config}' existe (ID: {collection_id}). Ajout/Mise à jour des éléments...")
                    if not dry_run:
                        if self.jellyfin.add_to_collection(collection_id, filtered_item_ids):
                            logger.info(f"      Éléments ajoutés/mis à jour avec succès dans '{col_name_config}'.")
                        else:
                            logger.error(f"      Échec de l'ajout/mise à jour des éléments dans '{col_name_config}'.")
                    else:
                        logger.info(f"      DRY RUN: Simulerait l'ajout de {len(filtered_item_ids)} éléments à la collection '{col_name_config}'.")
                else:
                    logger.info(f"    Collection '{col_name_config}' n'existe pas. Création...")
                    if not dry_run:
                        new_collection_id = self.jellyfin.create_collection(col_name_config, filtered_item_ids, library_id=jellyfin_lib_id)
                        if new_collection_id:
                            logger.info(f"      Collection '{col_name_config}' créée avec succès (ID: {new_collection_id}).")
                        else:
                            logger.error(f"      Échec de la création de la collection '{col_name_config}'.")
                    else:
                        logger.info(f"      DRY RUN: Simulerait la création de la collection '{col_name_config}' avec {len(filtered_item_ids)} éléments.")
                
                # Gestion du poster (si configuré et si la collection existe/a été créée)
                # TODO: Ajouter la logique de mise à jour du poster ici

        logger.info("=== Traitement Jellyfin Kometa terminé ===")

if __name__ == "__main__":
    config_file_arg = sys.argv[1] if len(sys.argv) > 1 else "config/jellyfin_config.yaml"
    
    if not Path(config_file_arg).exists():
        script_dir = Path(__file__).parent
        config_file_rel_to_script = script_dir.parent / config_file_arg
        
        if config_file_rel_to_script.exists():
            config_file_arg = str(config_file_rel_to_script)
            logger.info(f"Utilisation du fichier de configuration relatif au script: {config_file_arg}")
        else:
            logger.error(f"Fichier de configuration '{config_file_arg}' non trouvé (ni en absolu, ni relatif au script à '{config_file_rel_to_script}'). Arrêt.")
            sys.exit(1)

    logger.info(f"Lancement de JellyfinKometa avec le fichier de configuration: {config_file_arg}")
    kometa_manager = JellyfinKometa(config_file_arg)
    kometa_manager.run()
