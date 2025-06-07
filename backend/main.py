import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from PIL import Image
import io
import numpy as np
import tensorflow as tf
import cv2 


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
    content = await file.read()
    pil = Image.open(io.BytesIO(content)).convert("L")
    img = np.array(pil)

    _, th = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    th = 255 - th

    coords = cv2.findNonZero(th)
    if coords is None:
        return JSONResponse({"error": "No digit found"}, status_code=400)
    x, y, w, h = cv2.boundingRect(coords)

    digit = th[y : y + h, x : x + w]
    size = max(w, h)
    square = np.full((size, size), 255, dtype=np.uint8)
    x_off = (size - w) // 2
    y_off = (size - h) // 2
    square[y_off : y_off + h, x_off : x_off + w] = digit

    resized = cv2.resize(square, (28, 28), interpolation=cv2.INTER_AREA)

    arr = resized.astype("float32") / 255.0
    arr = arr.reshape(1, 784)

    preds = model.predict(arr)
    digit_pred = int(np.argmax(preds, axis=1)[0])
    confidence = float(np.max(preds))

    return {"digit": digit_pred, "confidence": confidence}


app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
