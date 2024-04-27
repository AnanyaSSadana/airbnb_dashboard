from flask import Flask, jsonify, render_template
import pandas as pd
import json

app = Flask(__name__)

# Load the Airbnb data
airbnb_data = pd.read_csv('Airbnb_Open_Data_clean.csv', dtype={'latitude': float, 'longitude': float, 'price': float})

# Calculate average price per borough
average_prices = airbnb_data.groupby('neighbourhood_group')['price'].mean().reset_index()

# Load GeoJSON data
with open('new-york-city-boroughs.geojson', 'r') as f:
    geojson_data = json.load(f)

# Integrate average price data with GeoJSON
for feature in geojson_data['features']:
    borough_name = feature['properties']['name']
    match = average_prices[average_prices['neighbourhood_group'] == borough_name]
    if not match.empty:
        feature['properties']['average_price'] = match['price'].values[0]
    else:
        feature['properties']['average_price'] = None  


@app.route('/chloropleth')
def get_geojson():
    return jsonify(geojson_data)

@app.route('/properties')
def properties():
    properties_data = airbnb_data[['latitude', 'longitude', 'price']].dropna().to_dict(orient='records')
    return jsonify(properties_data)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
