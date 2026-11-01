"""
CineMatch Flask Application
Serves the modern Glassmorphism SPA and exposes RESTful API endpoints
for content-based movie recommendations and similarity analytics.
"""

from flask import Flask, send_from_directory, request, jsonify
import os
from recommender import MovieRecommender

app = Flask(__name__, static_folder='static', static_url_path='/static')

# Initialize the recommendation engine on server startup
print("Initializing CineMatch ML Engine...")
recommender = MovieRecommender()

@app.route('/')
def index():
    """Serves the main application landing page."""
    return send_from_directory('static', 'index.html')

@app.route('/api/health')
def health():
    """System health check and engine metadata."""
    return jsonify({
        "status": "healthy",
        "engine": "CineMatch ML Engine v2.0",
        "total_movies": len(recommender.df) if hasattr(recommender, 'df') else 0,
        "supported_models": ["tfidf", "count"],
        "version": "2.0.0"
    })

@app.route('/api/recommend')
def recommend():
    """
    Query recommendations for a given title.
    Query parameters:
        title (str): Movie title to match
        model (str): 'tfidf' (default) or 'count'
        top_k (int): Number of recommendations to return (default: 6)
    """
    title = request.args.get('title')
    model = request.args.get('model', 'tfidf').lower()
    top_k = request.args.get('top_k', 6, type=int)
    
    if not title:
        return jsonify({"error": "Query parameter 'title' is required."}), 400
        
    if model not in ['tfidf', 'count']:
        return jsonify({"error": f"Invalid model type '{model}'. Choose 'tfidf' or 'count'."}), 400
        
    results = recommender.get_recommendations(title, model_type=model, top_k=top_k)
    return jsonify(results)

@app.route('/visualizations/<path:filename>')
def serve_visualization(filename):
    """Serves generated analytical visualization plots."""
    viz_dir = os.path.join(app.root_path, 'assets', 'visualizations')
    return send_from_directory(viz_dir, filename)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serves static documentation assets and screenshots."""
    assets_dir = os.path.join(app.root_path, 'assets')
    return send_from_directory(assets_dir, filename)

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    os.makedirs('static', exist_ok=True)
    os.makedirs(os.path.join('assets', 'visualizations'), exist_ok=True)
    print("CineMatch Server starting on http://127.0.0.1:5000 ...")
    app.run(debug=True, port=5000)
