import requests
import yaml
import json
import os
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import time

class JellyfinAPI:
    def __init__(self, server_url: str, api_key: str):
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            'X-Emby-Token': api_key,
            'Content-Type': 'application/json'
        }
    
    def get_libraries(self) -> List[Dict]:
        """Récupère toutes les bibliothèques"""
        url = f"{self.server_url}/Users"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            users = response.json()
            if users:
                user_id = users[0]['Id']
                
                url = f"{self.server_url}/Users/{user_id}/Views"
                response = requests.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()['Items']
        return []
    
    def get_items(self, library_id: str, item_type: str = None, filters: Dict = None) -> List[Dict]:
        """Récupère les éléments d'une bibliothèque"""
        url = f"{self.server_url}/Items"
        params = {
            'ParentId': library_id,
            'Recursive': 'true',
            'Fields': 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,Tags'
        }
        
        if item_type:
            params['IncludeItemTypes'] = item_type
        
        if filters:
            params.update(filters)
        
        response = requests.get(url, headers=self.headers, params=params)
        if response.status_code == 200:
            return response.json()['Items']
        return []
    
    def create_collection(self, name: str, item_ids: List[str], library_id: str) -> Optional[str]:
        """Crée une nouvelle collection"""
        url = f"{self.server_url}/Collections"
        data = {
            'Name': name,
            'ParentId': library_id,
            'Ids': item_ids
        }
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code == 200:
            return response.json()['Id']
        return None
    
    def get_collections(self, library_id: str) -> List[Dict]:
        """Récupère les collections existantes"""
        return self.get_items(library_id, 'BoxSet')
    
    def add_to_collection(self, collection_id: str, item_ids: List[str]):
        """Ajoute des éléments à une collection"""
        url = f"{self.server_url}/Collections/{collection_id}/Items"
        params = {'Ids': ','.join(item_ids)}
        response = requests.post(url, headers=self.headers, params=params)
        return response.status_code == 204
    
    def update_item_metadata(self, item_id: str, metadata: Dict):
        """Met à jour les métadonnées d'un élément"""
        url = f"{self.server_url}/Items/{item_id}"
        response = requests.post(url, headers=self.headers, json=metadata)
        return response.status_code == 204

class JellyfinKometa:
    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.config = self.load_config()
        self.jellyfin = JellyfinAPI(
            self.config['jellyfin']['url'],
            self.config['jellyfin']['api_key']
        )
        self.libraries = {}
        self.load_libraries()
    
    def load_config(self) -> Dict:
        """Charge la configuration depuis le fichier YAML"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as file:
                return yaml.safe_load(file)
        except FileNotFoundError:
            print(f"Fichier de configuration non trouvé: {self.config_path}")
            return self.create_default_config()
    
    def create_default_config(self) -> Dict:
        """Crée une configuration par défaut"""
        default_config = {
            'jellyfin': {
                'url': 'http://localhost:8096',
                'api_key': 'YOUR_API_KEY_HERE'
            },
            'libraries': {
                'Films': {
                    'collections': {
                        'Marvel Cinematic Universe': {
                            'filters': {
                                'genre': 'Action',
                                'studio': 'Marvel Studios'
                            },
                            'poster': 'https://example.com/mcu_poster.jpg'
                        },
                        'Films des années 80': {
                            'filters': {
                                'year_range': [1980, 1989]
                            }
                        }
                    }
                },
                'Séries TV': {
                    'collections': {
                        'Séries Netflix': {
                            'filters': {
                                'network': 'Netflix'
                            }
                        }
                    }
                }
            },
            'settings': {
                'update_interval': 3600,
                'create_missing_collections': True,
                'update_posters': True
            }
        }
        
        # Sauvegarde la configuration par défaut
        with open(self.config_path, 'w', encoding='utf-8') as file:
            yaml.dump(default_config, file, default_flow_style=False, allow_unicode=True)
        
        print(f"Configuration par défaut créée: {self.config_path}")
        print("Veuillez modifier la configuration avec vos paramètres Jellyfin")
        return default_config
    
    def load_libraries(self):
        """Charge les bibliothèques Jellyfin"""
        libraries = self.jellyfin.get_libraries()
        for library in libraries:
            self.libraries[library['Name']] = library['Id']
        print(f"Bibliothèques trouvées: {list(self.libraries.keys())}")
    
    def filter_items(self, items: List[Dict], filters: Dict) -> List[Dict]:
        """Filtre les éléments selon les critères"""
        filtered_items = []
        
        for item in items:
            match = True
            
            # Filtre par genre
            if 'genre' in filters:
                item_genres = [g['Name'] for g in item.get('Genres', [])]
                if filters['genre'] not in item_genres:
                    match = False
            
            # Filtre par année
            if 'year' in filters:
                if item.get('ProductionYear') != filters['year']:
                    match = False
            
            # Filtre par plage d'années
            if 'year_range' in filters:
                year_range = filters['year_range']
                item_year = item.get('ProductionYear', 0)
                if not (year_range[0] <= item_year <= year_range[1]):
                    match = False
            
            # Filtre par studio/réseau
            if 'studio' in filters or 'network' in filters:
                studios = [s['Name'] for s in item.get('Studios', [])]
                filter_studio = filters.get('studio') or filters.get('network')
                if filter_studio not in studios:
                    match = False
            
            # Filtre par note IMDb
            if 'imdb_rating' in filters:
                rating = item.get('CommunityRating', 0)
                if rating < filters['imdb_rating']:
                    match = False
            
            if match:
                filtered_items.append(item)
        
        return filtered_items
    
    def create_collections(self):
        """Crée les collections selon la configuration"""
        for library_name, library_config in self.config.get('libraries', {}).items():
            if library_name not in self.libraries:
                print(f"Bibliothèque '{library_name}' non trouvée")
                continue
            
            library_id = self.libraries[library_name]
            print(f"\nTraitement de la bibliothèque: {library_name}")
            
            # Récupère tous les éléments de la bibliothèque
            items = self.jellyfin.get_items(library_id)
            print(f"  {len(items)} éléments trouvés")
            
            # Récupère les collections existantes
            existing_collections = self.jellyfin.get_collections(library_id)
            existing_names = {col['Name']: col['Id'] for col in existing_collections}
            
            # Traite chaque collection configurée
            for collection_name, collection_config in library_config.get('collections', {}).items():
                print(f"  Traitement de la collection: {collection_name}")
                
                # Filtre les éléments
                filters = collection_config.get('filters', {})
                filtered_items = self.filter_items(items, filters)
                
                if not filtered_items:
                    print(f"    Aucun élément trouvé pour les filtres: {filters}")
                    continue
                
                item_ids = [item['Id'] for item in filtered_items]
                print(f"    {len(filtered_items)} éléments correspondent aux critères")
                
                # Crée ou met à jour la collection
                if collection_name in existing_names:
                    collection_id = existing_names[collection_name]
                    print(f"    Collection existante trouvée, ajout des éléments...")
                    self.jellyfin.add_to_collection(collection_id, item_ids)
                else:
                    print(f"    Création de la nouvelle collection...")
                    collection_id = self.jellyfin.create_collection(
                        collection_name, item_ids, library_id
                    )
                    if collection_id:
                        print(f"    Collection créée avec l'ID: {collection_id}")
                    else:
                        print(f"    Erreur lors de la création de la collection")
    
    def update_metadata(self):
        """Met à jour les métadonnées selon la configuration"""
        metadata_config = self.config.get('metadata', {})
        
        for library_name, items_config in metadata_config.items():
            if library_name not in self.libraries:
                continue
            
            library_id = self.libraries[library_name]
            items = self.jellyfin.get_items(library_id)
            
            for item_config in items_config:
                # Trouve l'élément par titre
                title = item_config.get('title')
                matching_items = [item for item in items if item['Name'] == title]
                
                for item in matching_items:
                    metadata = {}
                    if 'overview' in item_config:
                        metadata['Overview'] = item_config['overview']
                    if 'rating' in item_config:
                        metadata['CommunityRating'] = item_config['rating']
                    
                    if metadata:
                        self.jellyfin.update_item_metadata(item['Id'], metadata)
                        print(f"Métadonnées mises à jour pour: {title}")
    
    def run(self):
        """Lance le processus principal"""
        print("=== Jellyfin Kometa - Gestionnaire de Collections ===")
        print(f"Configuration chargée depuis: {self.config_path}")
        print(f"Serveur Jellyfin: {self.config['jellyfin']['url']}")
        
        try:
            # Teste la connexion
            libraries = self.jellyfin.get_libraries()
            if not libraries:
                print("Erreur: Impossible de se connecter à Jellyfin ou aucune bibliothèque trouvée")
                return
            
            print(f"Connexion réussie! {len(libraries)} bibliothèques trouvées")
            
            # Crée les collections
            self.create_collections()
            
            # Met à jour les métadonnées
            self.update_metadata()
            
            print("\n=== Traitement terminé ===")
            
        except Exception as e:
            print(f"Erreur lors du traitement: {e}")

# Exemple d'utilisation
if __name__ == "__main__":
    # Crée une instance du gestionnaire
    kometa = JellyfinKometa("jellyfin_config.yaml")
    
    # Lance le traitement
    kometa.run()
    
    # Exemple de configuration pour tester
    print("\n=== Configuration d'exemple ===")
    example_config = {
        'jellyfin': {
            'url': 'http://localhost:8096',
            'api_key': 'votre_clé_api_ici'
        },
        'libraries': {
            'Films': {
                'collections': {
                    'Films Marvel': {
                        'filters': {
                            'genre': 'Action',
                            'studio': 'Marvel Studios'
                        }
                    },
                    'Classiques des années 80': {
                        'filters': {
                            'year_range': [1980, 1989],
                            'imdb_rating': 7.0
                        }
                    },
                    'Films récents': {
                        'filters': {
                            'year_range': [2020, 2024]
                        }
                    }
                }
            },
            'Séries TV': {
                'collections': {
                    'Séries Netflix': {
                        'filters': {
                            'network': 'Netflix'
                        }
                    },
                    'Séries bien notées': {
                        'filters': {
                            'imdb_rating': 8.0
                        }
                    }
                }
            }
        },
        'metadata': {
            'Films': [
                {
                    'title': 'Avengers: Endgame',
                    'overview': 'Description personnalisée du film',
                    'rating': 9.0
                }
            ]
        },
        'settings': {
            'update_interval': 3600,
            'create_missing_collections': True,
            'update_posters': True,
            'dry_run': False
        }
    }
    
    print("Configuration d'exemple:")
    print(yaml.dump(example_config, default_flow_style=False, allow_unicode=True))
