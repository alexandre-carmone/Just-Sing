import numpy as np
import crepe
import time

class PitchExtractor:
    def __init__(self, sample_rate=16000, chunck_size_ms=80):
        self.sr = sample_rate
        self.chunck_size_ms = chunck_size_ms

    def __call__(self, chunk:np.array) -> float:
        current = time.time()
        time_chunk, frequency_chunk, confidence_chunk, activation_chunk = crepe.predict(
            chunk,
            self.sr,
            step_size=self.chunck_size_ms,
            viterbi=False,
            model_capacity='tiny')
        print(f"Pitch extraction in {time.time() - current:.2f}s")
        return float(frequency_chunk[0])



if __name__ == "__main__":

    audio_in = np.zeros(1280)   ## 80*16000/1000 = 1280 samples of zeros

    pitch_extractor = PitchExtractor()

    pitch = pitch_extractor(audio_in)

    print(f"Extracted pitch: {pitch}")




