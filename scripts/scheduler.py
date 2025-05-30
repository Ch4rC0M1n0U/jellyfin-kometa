#!/usr/bin/env python3
"""
Planificateur pour l'exécution automatique du script Jellyfin Kometa
"""

import os
import time
import schedule
import subprocess
import logging
from datetime import datetime

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/scheduler.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def run_kometa_script():
    """Exécute le script Jellyfin Kometa"""
    try:
        logger.info("🚀 Démarrage de l'exécution du script Kometa")
        
        # Exécute le script Python
        result = subprocess.run([
            'python3', '/app/scripts/jellyfin_kometa.py'
        ], capture_output=True, text=True, cwd='/app')
        
        if result.returncode == 0:
            logger.info("✅ Script Kometa exécuté avec succès")
            logger.info(f"Sortie: {result.stdout}")
        else:
            logger.error(f"❌ Erreur lors de l'exécution du script: {result.stderr}")
            
    except Exception as e:
        logger.error(f"❌ Exception lors de l'exécution: {e}")

def main():
    """Fonction principale du planificateur"""
    logger.info("📅 Démarrage du planificateur Jellyfin Kometa")
    
    # Récupère la configuration du cron depuis les variables d'environnement
    cron_schedule = os.getenv('CRON_SCHEDULE', '0 */6 * * *')
    logger.info(f"⏰ Planification configurée: {cron_schedule}")
    
    # Parse le cron schedule (format simplifié)
    # Pour cet exemple, on utilise un intervalle en heures
    interval_hours = 6  # Par défaut toutes les 6 heures
    
    try:
        # Extrait l'intervalle depuis le cron (format: 0 */X * * *)
        parts = cron_schedule.split()
        if len(parts) >= 2 and parts[1].startswith('*/'):
            interval_hours = int(parts[1][2:])
    except:
        logger.warning(f"Format de cron non reconnu, utilisation de l'intervalle par défaut: {interval_hours}h")
    
    # Programme l'exécution
    schedule.every(interval_hours).hours.do(run_kometa_script)
    
    # Exécution immédiate au démarrage
    logger.info("🎯 Exécution immédiate au démarrage")
    run_kometa_script()
    
    # Boucle principale
    logger.info(f"🔄 Planificateur actif - prochaine exécution dans {interval_hours}h")
    while True:
        schedule.run_pending()
        time.sleep(60)  # Vérifie toutes les minutes

if __name__ == "__main__":
    main()
