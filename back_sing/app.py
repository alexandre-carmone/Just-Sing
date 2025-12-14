import asyncio
import json
import time

import bentoml
import dotenv
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from pitch_extractor import PitchExtractor
from transcription import Transcription

dotenv.load_dotenv()

# Initialize FastAPI app
app = FastAPI()


# Define BentoML Service and mount the app
@bentoml.service(
    traffic={"timeout": 30}
)
@bentoml.asgi_app(app, path="/sing")
class WebSocketService:
    def __init__(self):
        print("Service initialized")
        self.active_transcriptions = {}
        # Initialiser l'extracteur de pitch
        self.pitch_extractor = PitchExtractor(sample_rate=24_000, chunck_size_ms=80)
        self.pitch_extractor(np.zeros(12_000))

        # Charger les données de vérité terrain
        self.ground_truth_data = self.load_ground_truth()

    def load_ground_truth(self):
        """Charge les données de vérité terrain depuis transcription.json"""
        try:
            with open('transcription.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"✅ Données de vérité terrain chargées: {len(data)} entrées")
            return data
        except Exception as e:
            print(f"❌ Erreur lors du chargement de transcription.json: {e}")
            return []

    def get_ground_truth_at_time(self, relative_time_s: float, tolerance: float = 0.5):
        """Retourne les mots de vérité terrain correspondant au timestamp relatif"""
        matching_words = []

        for entry in self.ground_truth_data:
            word_time = entry.get('start_s', 0)

            # Vérifier si le mot correspond au timestamp avec tolérance
            if abs(word_time - relative_time_s) <= tolerance:
                matching_words.append({
                    'text': entry.get('text', ''),
                    'start_s': entry.get('start_s', 0),
                    'stop_s': entry.get('stop_s', 0),
                    'time_diff': abs(word_time - relative_time_s)
                })

        # Trier par proximité temporelle
        matching_words.sort(key=lambda x: x['time_diff'])
        return matching_words

    @app.websocket("/ws/ground_truth")
    async def ground_truth_endpoint(self, websocket: WebSocket):
        """Endpoint qui retourne la vérité terrain basée sur le timestamp relatif"""
        await websocket.accept()
        print("WebSocket ground truth connection accepted")

        # Enregistrer le temps de début de connexion
        connection_start_time = time.time()
        print(f"🕐 Début de connexion: {connection_start_time}")

        try:
            # Envoyer un message d'initialisation
            init_response = {
                "type": "connection_established",
                "connection_time": connection_start_time,
                "total_entries": len(self.ground_truth_data),
                "timestamp": 0.0
            }
            await websocket.send_json(init_response)

            # Boucle principale pour calculer le temps relatif et envoyer la vérité terrain
            while True:
                try:
                    # Calculer le temps relatif depuis le début de la connexion
                    current_time = time.time()
                    relative_time = current_time - connection_start_time

                    # Obtenir les mots correspondants au timestamp actuel
                    matching_words = self.get_ground_truth_at_time(relative_time)



                    if matching_words:
                        for word_data in matching_words[:3]:  # Limite à 3 mots max
                            response = {
                                "type": "ground_truth",
                                "text": word_data['text'],
                                "expected_time_s": word_data['start_s'],
                                "actual_relative_time_s": relative_time,
                                "time_difference": word_data['time_diff'],
                                "timestamp": current_time
                            }

                            await websocket.send_json(response)
                            print(
                                f"📤 Vérité terrain envoyée: '{word_data['text']}' à t={relative_time:.2f}s (attendu: {word_data['start_s']}s)")

                    # Attendre 100ms avant la prochaine vérification
                    await asyncio.sleep(0.1)

                except WebSocketDisconnect:
                    print("Ground truth client disconnected")
                    break
                except Exception as e:
                    print(f"Error in ground truth processing: {e}")
                    break

        except Exception as e:
            print(f"Ground truth connection error: {e}")
        finally:
            print("Ground truth connection closed")

    @app.websocket("/ws/transcription")
    async def transcription_endpoint(self, websocket: WebSocket):
        """Endpoint dédié à la transcription audio"""
        await websocket.accept()
        print("WebSocket transcription connection accepted")

        # Créer une instance de transcription pour cette connexion
        transcription = Transcription()
        stream = await transcription.start_transcription_stream()

        if not stream:
            await websocket.close(code=1011, reason="Failed to start transcription")
            return

        try:
            # Lancer la tâche de traitement des résultats de transcription
            transcription_task = asyncio.create_task(
                self.process_transcription_results(websocket, transcription)
            )

            # Boucle principale pour recevoir l'audio
            while True:
                try:
                    # Recevoir les données audio
                    data = await websocket.receive_bytes()
                    audio_data = np.frombuffer(data, dtype=np.float32)
                    print(f"Received audio for transcription: {audio_data.shape}")

                    # Envoyer l'audio à la transcription
                    await transcription.add_audio_chunk(audio_data)

                except WebSocketDisconnect:
                    print("Transcription client disconnected")
                    break
                except Exception as e:
                    print(f"Error receiving transcription data: {e}")
                    break

        except Exception as e:
            print(f"Transcription connection error: {e}")
        finally:
            # Nettoyer les ressources
            await transcription.stop_transcription()
            if not transcription_task.done():
                transcription_task.cancel()
            print("Transcription connection closed and resources cleaned up")

    @app.websocket("/ws/pitch")
    async def pitch_endpoint(self, websocket: WebSocket):
        """Endpoint dédié à l'extraction du pitch"""
        await websocket.accept()
        print("WebSocket pitch connection accepted")

        try:
            # Boucle principale pour recevoir l'audio et extraire le pitch
            while True:
                try:
                    # Recevoir les données audio
                    data = await websocket.receive_bytes()
                    audio_data = np.frombuffer(data, dtype=np.float32)
                    print(f"Received audio for pitch: {audio_data.shape}")

                    # Extraire le pitch de l'audio reçu
                    pitch_value = self.extract_pitch_from_audio(audio_data)

                    # Créer la réponse avec le pitch
                    response = {
                        "pitch": pitch_value,
                        "timestamp": asyncio.get_event_loop().time()
                    }

                    # Envoyer le résultat au client
                    await websocket.send_json(response)
                    print(f"Sent pitch: {pitch_value}")

                except WebSocketDisconnect:
                    print("Pitch client disconnected")
                    break
                except Exception as e:
                    print(f"Error processing pitch data: {e}")
                    break

        except Exception as e:
            print(f"Pitch connection error: {e}")
        finally:
            print("Pitch connection closed")

    @app.websocket("/ws")
    async def combined_endpoint(self, websocket: WebSocket):
        """Endpoint combiné (maintenu pour compatibilité)"""
        await websocket.accept()
        print("WebSocket combined connection accepted")

        # Créer une instance de transcription pour cette connexion
        transcription = Transcription()
        stream = await transcription.start_transcription_stream()

        if not stream:
            await websocket.close(code=1011, reason="Failed to start transcription")
            return

        try:
            # Lancer la tâche de traitement des résultats de transcription
            transcription_task = asyncio.create_task(
                self.process_combined_results(websocket, transcription)
            )

            # Boucle principale pour recevoir l'audio
            while True:
                try:
                    # Recevoir les données audio
                    data = await websocket.receive_bytes()
                    audio_data = np.frombuffer(data, dtype=np.float32)
                    print(f"Received audio: {audio_data.shape}")

                    # Envoyer l'audio à la transcription
                    await transcription.add_audio_chunk(audio_data)

                    # Extraire le pitch de l'audio reçu
                    pitch_value = self.extract_pitch_from_audio(audio_data)

                    # Stocker le pitch pour l'utiliser dans la réponse
                    transcription.last_pitch = pitch_value

                except WebSocketDisconnect:
                    print("Combined client disconnected")
                    break
                except Exception as e:
                    print(f"Error receiving combined data: {e}")
                    break

        except Exception as e:
            print(f"Combined connection error: {e}")
        finally:
            # Nettoyer les ressources
            await transcription.stop_transcription()
            if not transcription_task.done():
                transcription_task.cancel()
            print("Combined connection closed and resources cleaned up")

    def extract_pitch_from_audio(self, audio_data: np.ndarray) -> float:
        """Extrait le pitch de l'audio en utilisant le PitchExtractor"""
        try:
            # S'assurer que l'audio a la bonne taille pour l'extracteur
            # (1280 échantillons pour 80ms à 16kHz)
            expected_size = int(self.pitch_extractor.chunck_size_ms * self.pitch_extractor.sr / 1000)

            if len(audio_data) >= expected_size:
                # Prendre les premiers échantillons si l'audio est plus long
                audio_chunk = audio_data[:expected_size]
            else:
                # Compléter avec des zéros si l'audio est plus court
                audio_chunk = np.pad(audio_data, (0, expected_size - len(audio_data)), 'constant')

            pitch = self.pitch_extractor(audio_chunk)
            print(f"Extracted pitch: {pitch}")
            return pitch

        except Exception as e:
            print(f"Error extracting pitch: {e}")
            return 0.0  # Retourner une valeur par défaut en cas d'erreur

    async def process_transcription_results(self, websocket: WebSocket, transcription: Transcription):
        """Traite les résultats de transcription uniquement"""
        print("Starting transcription results processing task")
        try:
            async for message in transcription.get_transcription_results():
                # Créer la réponse avec transcription uniquement
                response = {
                    "word": str(message.text),
                    "timestamp": asyncio.get_event_loop().time()
                }
                print(f"Transcription: {message}")

                await websocket.send_json(response)
                print(f"Sent transcription: {message}")

        except Exception as e:
            print(f"Error processing transcription results: {e}")

        print("Transcription results processing task finished")

    async def process_combined_results(self, websocket: WebSocket, transcription: Transcription):
        """Traite les résultats de transcription avec pitch (endpoint combiné)"""
        print("Starting combined results processing task")
        try:
            async for message in transcription.get_transcription_results():
                # Utiliser le dernier pitch extrait ou une valeur par défaut
                pitch_value = getattr(transcription, 'last_pitch', 0.0)

                # Créer la réponse avec transcription et pitch réel
                response = {
                    "word": str(message.text),
                    "pitch": pitch_value,
                    "timestamp": asyncio.get_event_loop().time()
                }
                print(f"Transcription: {message}")

                await websocket.send_json(response)
                print(f"Sent transcription with pitch {pitch_value}: {message}")

        except Exception as e:
            print(f"Error processing combined results: {e}")

        print("Combined results processing task finished")