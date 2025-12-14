import bentoml
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import dotenv
import random
import asyncio
from transcription import Transcription
from pitch_extractor import PitchExtractor

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

    @app.websocket("/ws")
    async def websocket_endpoint(self, websocket: WebSocket):
        await websocket.accept()
        print("WebSocket connection accepted")

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
                    print(f"Received audio: {audio_data.shape}")

                    # Envoyer l'audio à la transcription
                    await transcription.add_audio_chunk(audio_data)

                    # Extraire le pitch de l'audio reçu
                    pitch_value = self.extract_pitch_from_audio(audio_data)

                    # Stocker le pitch pour l'utiliser dans la réponse
                    # (ou l'envoyer directement selon vos besoins)
                    transcription.last_pitch = pitch_value

                except WebSocketDisconnect:
                    print("Client disconnected")
                    break
                except Exception as e:
                    print(f"Error receiving data: {e}")
                    break

        except Exception as e:
            print(f"Connection error: {e}")
        finally:
            # Nettoyer les ressources
            await transcription.stop_transcription()
            if not transcription_task.done():
                transcription_task.cancel()
            print("Connection closed and resources cleaned up")

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
        """Traite les résultats de transcription et les envoie au client"""
        print("Starting transcription results processing task")
        try:
            while True:
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
            print(f"Error processing transcription results: {e}")

        print("Transcription results processing task finished")