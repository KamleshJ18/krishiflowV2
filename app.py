from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
import sqlite3
import requests

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "krishiflow.db"

app = Flask(__name__)
STORAGE_OPTIONS = [
    {
        "name": "GreenGrain Warehouse",
        "distance_km": 8,
        "price_per_kg_day": 1.80,
        "suitable_for": ["Wheat", "Onion", "Potato"],
        "description": "Suitable for dry grain storage"
    },
    {
        "name": "AgriSafe Depot",
        "distance_km": 12,
        "price_per_kg_day": 2.10,
        "suitable_for": ["Wheat", "Tomato", "Onion", "Potato"],
        "description": "Covered storage with transport support"
    },
    {
        "name": "FarmerSafe Storage",
        "distance_km": 15,
        "price_per_kg_day": 1.60,
        "suitable_for": ["Wheat", "Potato"],
        "description": "Affordable covered storage"
    }
]


# -----------------------------
# DATABASE
# -----------------------------
def get_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_db()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS produce (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crop TEXT NOT NULL,
            quantity REAL NOT NULL,
            quality TEXT NOT NULL,
            expected_price REAL NOT NULL,
            location TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


# -----------------------------
# REAL WEATHER
# -----------------------------
def get_weather(location_name):

    # Convert city name into latitude/longitude
    geo_url = "https://geocoding-api.open-meteo.com/v1/search"

    geo_params = {
        "name": location_name,
        "count": 1,
        "language": "en",
        "format": "json",
        "countryCode": "IN"
    }

    geo_response = requests.get(
        geo_url,
        params=geo_params,
        timeout=10
    )

    geo_response.raise_for_status()

    geo_data = geo_response.json()

    if not geo_data.get("results"):
        raise ValueError(
            f"Could not find location: {location_name}"
        )

    location = geo_data["results"][0]

    latitude = location["latitude"]
    longitude = location["longitude"]

    # Get weather forecast
    weather_url = "https://api.open-meteo.com/v1/forecast"

    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "precipitation_probability,"
            "rain"
        ),
        "forecast_days": 2,
        "timezone": "auto"
    }

    weather_response = requests.get(
        weather_url,
        params=weather_params,
        timeout=10
    )

    weather_response.raise_for_status()

    weather_data = weather_response.json()

    hourly = weather_data["hourly"]

    temperature = hourly["temperature_2m"][0]
    humidity = hourly["relative_humidity_2m"][0]
    rain_probability = hourly["precipitation_probability"][0]

    # Simple prototype risk level
    if humidity >= 80 or rain_probability >= 60:
        rain_risk = "High"

    elif humidity >= 70 or rain_probability >= 30:
        rain_risk = "Moderate"

    else:
        rain_risk = "Low"

    # Find the next relatively safer hour.
    # This is a prototype heuristic, NOT a farming guarantee.
    best_hour_index = 0

    for i in range(
        min(24, len(hourly["relative_humidity_2m"]))
    ):
        h = hourly["relative_humidity_2m"][i]
        r = hourly["precipitation_probability"][i]

        if h < 70 and r < 30:
            best_hour_index = i
            break

    best_time = hourly["time"][best_hour_index]

    return {
        "city": location["name"],
        "latitude": latitude,
        "longitude": longitude,
        "temperature": temperature,
        "humidity": humidity,
        "rain_probability": rain_probability,
        "rain_risk": rain_risk,
        "suggested_time": best_time
    }


# -----------------------------
# WEBSITE
# -----------------------------
@app.get("/")
def home():
    return send_from_directory(
        BASE_DIR,
        "index.html"
    )


@app.get("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(
        BASE_DIR,
        filename
    )


# -----------------------------
# HEALTH CHECK
# -----------------------------
@app.get("/api/health")
def health():

    return jsonify({
        "ok": True,
        "message": "KrishiFlow backend is connected!"
    })


# -----------------------------
# ANALYZE PRODUCE
# -----------------------------
@app.post("/api/analyze")
def analyze():

    data = request.get_json() or {}
    print("LOCATION RECEIVED:", data.get("location"))

    crop = data.get("crop", "Wheat")
    quantity = float(data.get("quantity", 0))
    quality = data.get("quality", "Good")
    expected_price = float(
        data.get("expected_price", 0)
    )
    location = data.get(
        "location",
        "Jaipur"
    ).strip()

    # Demo market reference prices
    market_prices = {
        "Wheat": 24,
        "Tomato": 26,
        "Onion": 22,
        "Potato": 23
    }

    reference_price = market_prices.get(
        crop,
        24
    )

    price_gap = (
        expected_price -
        reference_price
    )

    # Get REAL weather
    try:

        weather = get_weather(location)

    except Exception as error:

        return jsonify({
            "error": f"Weather lookup failed: {error}"
        }), 500


    humidity = weather["humidity"]
    temperature = weather["temperature"]
    rain_risk = weather["rain_risk"]
    rain_probability = weather["rain_probability"]
    suggested_time = weather["suggested_time"]                  

    # -----------------------------
    # RECOMMENDATION
    # -----------------------------

    if quality == "Needs Attention":

        action = "ATTENTION"

        reason = (
            "Your produce needs attention "
            "before selling or storing."
        )

    elif (
        price_gap > 1
        and humidity >= 75
    ):

        action = "STORE"

        reason = (
            "The market reference price is "
            "below your target while humidity "
            "risk is elevated. Consider suitable "
            "storage before waiting for a better price."
        )

    elif (
        price_gap <= 1
        and humidity < 70
    ):

        action = "SELL"

        reason = (
            "The market reference is close to "
            "your target and current humidity "
            "risk is lower."
        )

    else:

        action = "SELL SOON"

        reason = (
            "Consider selling soon and re-checking "
            "weather and market conditions."
        )


    # -----------------------------
    # SAVE PRODUCE
    # -----------------------------

    connection = get_db()

    connection.execute(
        """
        INSERT INTO produce
        (crop, quantity, quality, expected_price, location)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            crop,
            quantity,
            quality,
            expected_price,
            location
        )
    )

    connection.commit()
    connection.close()


    # -----------------------------
    # SEND DATA TO FRONTEND
    # -----------------------------

    
    storage_options = [
        storage
        for storage in STORAGE_OPTIONS
        if crop in storage["suitable_for"]
    ]

    return jsonify({
        "crop": crop,
        "quantity": quantity,
        "quality": quality,
        "location": location,
        "expected_price": expected_price,
        "reference_price": reference_price,
        "price_gap": round(price_gap, 2),
        "humidity": humidity,
        "temperature": weather["temperature"],
        "rain_risk": weather["rain_risk"],
        "rain_probability": weather["rain_probability"],
        "suggested_time": weather["suggested_time"],
        "city": weather["city"],
        "action": action,
        "reason": reason,
        "storage_options": storage_options
    })


# -----------------------------
# SAVED PRODUCE
# -----------------------------
@app.get("/api/produce")
def get_produce():

    connection = get_db()

    rows = connection.execute(
        """
        SELECT *
        FROM produce
        ORDER BY id DESC
        """
    ).fetchall()

    connection.close()

    return jsonify([
        dict(row)
        for row in rows
    ])


# -----------------------------
# START SERVER
# -----------------------------
if __name__ == "__main__":

    init_db()

    app.run(
        debug=True
    )