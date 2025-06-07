import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from PIL import Image
import io
import numpy as np
import tensorflow as tf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dist = os.path.join(os.path.dirname(__file__), "dist")

model = tf.keras.models.load_model("fcnn_model.h5")


@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("L").resize((28, 28))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = arr.reshape(1, 784)

    preds = model.predict(arr)
    digit = int(np.argmax(preds, axis=1)[0])
    confidence = float(np.max(preds))
    return {"digit": digit, "confidence": confidence}


app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
