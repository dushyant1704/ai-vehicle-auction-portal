from ultralytics import YOLO

if __name__ == "__main__":
    model = YOLO("yolov8s.pt")

    model.train(
        data="data.yaml",
        epochs=100,
        imgsz=640,
        batch=4,
        device=0,
        workers=0,
        project="damage_detection",
        name="car_damage_v1"
    )