from ultralytics import YOLO

model = YOLO(
    "runs/detect/damage_detection/car_damage_v1-3/weights/last.pt"
)

model.train(resume=True)