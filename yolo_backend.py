"""
Local YOLOv11 Neural Inference Micro-service
Runs on http://127.0.0.1:5001/api/detect
"""

import os
import io
import base64
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "last.pt"

app = Flask(__name__)
CORS(app)

print(f"Loading YOLOv11 model weights from {MODEL_PATH}...")
model = YOLO(str(MODEL_PATH))
print(f"✅ YOLOv11 Model loaded. Classes: {model.names}")

EMOTION_CLASSES = [
    "angry", "contempt", "disgust", "fear", "happy", 
    "natural", "sad", "sleepy", "surprised"
]

INSIGHTS = {
    "happy": "Elevated zygomaticus major activation and warm ocular radiance indicate high positive affect, vitality, and openness.",
    "sad": "Subtle inner-brow elevation and reduced facial muscle tension suggest reflective low-arousal state. Gentle acoustic grounding is recommended.",
    "angry": "Corrugator supercilii contraction and labial compression detected. A 4-7-8 parasympathetic breathing cycle helps lower autonomic arousal.",
    "fear": "Widened palpebral aperture and sympathetic alertness detected. Tactical box breathing can rapidly stabilize vagal tone.",
    "natural": "Balanced facial symmetry and relaxed baseline muscle tone indicate calm, centered homeostatic equilibrium.",
    "sleepy": "Reduced ocular blink velocity and relaxed periorbital posture indicate circadian fatigue or deep parasympathetic rest readiness.",
    "surprised": "Rapid frontalis elevation and acute attentional orienting response detected with heightened sensory receptivity.",
    "disgust": "Levator labii activation indicates aversive sensory filtering. Shift visual focus and reset respiratory cadence.",
    "contempt": "Asymmetric unilateral labial tension observed, indicative of guarded evaluation or analytical detachment."
}

VALENCE_MAP = {
    "happy": 88, "sad": 24, "angry": 18, "fear": 26, "natural": 68,
    "sleepy": 52, "surprised": 75, "disgust": 20, "contempt": 34
}

AROUSAL_MAP = {
    "happy": 74, "sad": 26, "angry": 90, "fear": 86, "natural": 40,
    "sleepy": 18, "surprised": 85, "disgust": 62, "contempt": 46
}

@app.route("/api/detect", methods=["POST"])
def detect():
    try:
        data = request.get_json(force=True)
        img_str = data.get("image", "")
        if not img_str:
            return jsonify({
                "status": "error",
                "message": "No image payload provided",
                "has_face": False,
                "face_count": 0
            }), 400

        if "," in img_str:
            img_str = img_str.split(",")[1]

        img_bytes = base64.b64decode(img_str)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np = np.array(pil_img)

        # Run YOLOv11 forward-pass
        results = model.predict(img_np, conf=0.20, verbose=False)
        weights = {e: 0.0 for e in EMOTION_CLASSES}
        boxes_out = []

        if results and len(results) > 0:
            res = results[0]
            if hasattr(res, "boxes") and res.boxes is not None:
                for box in res.boxes:
                    conf = float(box.conf[0].item()) if box.conf is not None else 0.0
                    cls_id = int(box.cls[0].item()) if box.cls is not None else -1
                    if 0 <= cls_id < len(EMOTION_CLASSES):
                        label = EMOTION_CLASSES[cls_id]
                        weights[label] += conf
                    else:
                        label = "natural"

                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    boxes_out.append({
                        "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                        "conf": round(conf * 100, 1),
                        "label": label
                    })

        has_face = len(boxes_out) > 0
        total_w = sum(weights.values())

        if has_face and total_w > 0:
            percentages = {e: round((v / total_w) * 100, 1) for e, v in weights.items()}
            dominant = max(percentages.items(), key=lambda x: x[1])[0]
            dominant_pct = percentages[dominant]
        else:
            # When no face is detected, set natural as neutral baseline
            percentages = {e: (100.0 if e == "natural" else 0.0) for e in EMOTION_CLASSES}
            dominant = "natural"
            dominant_pct = 100.0

        # Normalize key for frontend compatibility ('surprised' -> 'surprise')
        front_dominant = "surprise" if dominant == "surprised" else dominant
        front_spectrum = {}
        for k, v in percentages.items():
            norm_k = "surprise" if k == "surprised" else k
            front_spectrum[norm_k] = v

        return jsonify({
            "status": "success",
            "source": "yolov11-model",
            "has_face": has_face,
            "face_count": len(boxes_out),
            "dominant": front_dominant,
            "dominant_emotion": front_dominant,
            "confidence": dominant_pct,
            "dominant_percentage": dominant_pct,
            "spectrum": front_spectrum,
            "percentages": front_spectrum,
            "boxes": boxes_out,
            "insight": INSIGHTS.get(dominant, INSIGHTS["natural"]),
            "valence": VALENCE_MAP.get(dominant, 65),
            "arousal": AROUSAL_MAP.get(dominant, 45)
        })

    except Exception as e:
        print("YOLO Inference Error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "yolov11-9-class"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 YOLO Neural Engine listening on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
