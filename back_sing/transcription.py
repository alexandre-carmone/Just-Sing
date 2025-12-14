import asyncio
import time

import gradium
import os
import numpy as np
import dotenv
from typing import AsyncGenerator

dotenv.load_dotenv()


class Transcription:
    def __init__(self):
        self.client = gradium.client.GradiumClient(api_key=os.getenv("GRADIUM_KEY"))
        self.audio_queue = asyncio.Queue()
        self.stream = None

    async def audio_generator(self, chunk_size=1920) -> AsyncGenerator[np.ndarray, None]:
        """Générateur qui lit les chunks audio de la queue"""
        while True:
            try:
                # Attendre un nouveau chunk audio avec un timeout
                current = time.time()
                audio_chunk = await asyncio.wait_for(self.audio_queue.get(), timeout=1.0)
                print("send audio chuck to api")
                if audio_chunk is None:  # Signal de fin
                    break
                yield audio_chunk
                print(f"audio chunk sent in {time.time() - current:.2f}s")
            except asyncio.TimeoutError:
                # Continuer à attendre de nouveaux chunks
                continue

    async def start_transcription_stream(self):
        """Démarre le stream de transcription"""
        try:
            self.stream = await self.client.stt_stream(
                {"model_name": "default", "input_format": "pcm"},
                self.audio_generator(),
            )
            return self.stream
        except Exception as e:
            print(f"Erreur lors du démarrage du stream: {e}")
            return None

    async def add_audio_chunk(self, audio_data: np.ndarray):
        """Ajoute un chunk audio à la queue pour transcription"""
        await self.audio_queue.put(audio_data)

    async def stop_transcription(self):
        """Arrête la transcription"""
        await self.audio_queue.put(None)  # Signal de fin
        if self.stream:
            try:
                await self.stream.close()
            except:
                pass

    async def get_transcription_results(self):
        """Générateur qui yield les résultats de transcription"""
        if self.stream:
            try:
                async for message in self.stream.iter_text():
                    print(message)
                    yield message
            except Exception as e:
                print(f"Erreur lors de la lecture des résultats: {e}")


async def main():
    # Test avec un fichier audio
    audio_data = np.load("audio.npy")

    transcription = Transcription()
    stream = await transcription.start_transcription_stream()

    if stream:
        # Simuler l'envoi de chunks audio
        chunk_size = 1920

        async def send_chunks():
            for i in range(0, len(audio_data), chunk_size):
                chunk = audio_data[i: i + chunk_size]
                await transcription.add_audio_chunk(chunk)
                await asyncio.sleep(0.1)  # Simuler un délai

            await transcription.stop_transcription()

        # Lancer l'envoi et la réception en parallèle
        await asyncio.gather(
            send_chunks(),
            process_results(transcription)
        )


async def process_results(transcription):
    """Traite les résultats de transcription"""
    async for message in transcription.get_transcription_results():
        print(f"Transcription: {message}")


if __name__ == "__main__":
    asyncio.run(main())