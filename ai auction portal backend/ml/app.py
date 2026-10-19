from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

model = joblib.load("model.pkl")
encoders = joblib.load("encoders.pkl")

@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "XGBoost Pricing ML Service",
        "version": "1.0"
    })

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    try:
        brand = encoders["brand"].transform([data["brand"]])[0]
    except ValueError:
        # Fallback for unseen brands: use most common brand or median encoding
        brand = 0
    
    try:
        model_name = encoders["model"].transform([data["model"]])[0]
    except ValueError:
        # Fallback for unseen models: use median encoding
        model_name = 50
    
    try:
        fuel = encoders["fuel"].transform([data["fuel"]])[0]
    except ValueError:
        fuel = 4  # Default to Petrol
    
    try:
        transmission = encoders["transmission"].transform([data["transmission"]])[0]
    except ValueError:
        transmission = 1  # Default to Manual

    features = np.array([[
        brand,
        model_name,
        data["vehicle_age"],
        fuel,
        transmission,
        data["engine"],
        data["max_power"],
        data["seats"]
    ]])

    prediction = model.predict(features)[0]

    return jsonify({
        "predicted_price": round(float(prediction), 2)
    })

if __name__ == "__main__":
    app.run(port=5001)