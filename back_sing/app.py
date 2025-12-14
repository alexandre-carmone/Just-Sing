import bentoml
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import dotenv
import random
import asyncio
from transcription import Transcription

dotenv.load_dotenv()


class Models:
    def __init__(self):
        self.transcription_model = None
        self.audio_processor = None
        self.crepe_model = None

    def load_models(self):
        self.transcription_model = None
        self.audio_processor = None
        self.crepe_model = None

    def get_pitch(self, audio):
        # TODO pitch model function
        pass

    def get_transcription(self, audio):
        # TODO get transcription
        pass


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

    async def process_transcription_results(self, websocket: WebSocket, transcription: Transcription):
        """Traite les résultats de transcription et les envoie au client"""
        print("Starting transcription results processing task")
        try:
            while True:
                async for message in transcription.get_transcription_results():
                    # Créer la réponse avec transcription et pitch simulé
                    print()
                    response = {
                        "word": str(message.text),
                        "pitch": random.randint(100, 300),  # Remplacer par le vrai calcul de pitch
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    print(f"Transcription: {message}")

                    await websocket.send_json(response)
                    print(f"Sent transcription: {message}")

        except Exception as e:
            print(f"Error processing transcription results: {e}")

        print("Transcription results processing task finished")