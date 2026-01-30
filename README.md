# Team17_Tech_Synapse
Problem Statement 4

## Run

- Install deps: `npm install`
- Start: `npm start`
- App: http://localhost:3000

## YOLOv8 Image Detection (optional)

The app exposes `POST /api/detect` and the UI provides “Detect objects (YOLOv8)” buttons on:
- Visit form (pre-exam scan + proof photo)
- Patient registration photo

Requirements:
- Python 3.9+
- Install: `pip install ultralytics`

Optional env vars (see `.env.example`):
- `YOLO_PYTHON` (default `python`)
- `YOLO_MODEL` (default `yolov8n.pt`)
- `YOLO_CONF` (default `0.25`)
