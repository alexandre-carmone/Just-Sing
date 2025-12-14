import asyncio
import gradium
import json


async def main():
    client = gradium.client.GradiumClient(
        api_key="gsk_8feddca2723e6216be639e515ace16a019b8052f56e681a014febd0dd0b0c9e8"
    )

    # Audio generator that yields audio chunks
    async def audio_generator(audio_data, chunk_size=1920):
        for i in range(0, len(audio_data), chunk_size):
            yield audio_data[i : i + chunk_size]

    # Read audio data from a file
    audio_file_path = (
        "/home/charles/Downloads/pomme-dapi.wav"  # Change this to your audio file path
    )
    with open(audio_file_path, "rb") as f:
        audio_data = f.read()

    # Create STT stream
    stream = await client.stt_stream(
        {"model_name": "default", "input_format": "wav"},
        audio_generator(audio_data),
    )

    # Process transcription results and save to file
    results = []
    async for message in stream.iter_text():
        print(message)
        # Assuming message contains 'words' with 'start', 'end', 'word'
        if hasattr(message, "words"):
            for w in message.words:
                results.append(
                    {
                        "start": w.get("start"),
                        "end": w.get("end"),
                        "word": w.get("word"),
                    }
                )
    # Save results to file
    with open("transcription.json", "w") as out_f:
        json.dump(results, out_f, indent=2)


if __name__ == "__main__":
    asyncio.run(main())
