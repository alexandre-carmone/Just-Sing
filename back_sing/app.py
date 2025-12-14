import bentoml
import numpy as np
from fastapi import FastAPI, WebSocket
import dotenv

dotenv.load_dotenv()


class Models:


    def __init__(self):
        self.transcription_model = None
        self.audio_processor = None
        self.crepe_model = None

    def load_models(self):
        self.transcription_model = None
        self.audio_processor = None
        self.crepe_model =None

    def get_pitch(self, audio):
        #TODO pitch model function
        pass

    def get_transcription(self, audio):
        #TODO get transcription
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
        # Initialize your resources here (e.g., models, configurations)
        print("Service initialized")

    @app.websocket("/ws")
    async def websocket_endpoint(self, websocket: WebSocket):
        await websocket.accept()
        # Define your custom logic here
        print("WebSocket connection accepted")
        try:
            while True:
                data = await websocket.receive_bytes()
                data = np.frombuffer(data, dtype=np.float32)
                print(f"Received: {data.shape}")
                json = [
                    {"word": "Hello", "pitch": 1},
                    {"word": "World", "pitch": 2}
                ]
                await websocket.send_json(
                    json
                )
        except Exception as e:
            print(f"Connection closed: {e}")