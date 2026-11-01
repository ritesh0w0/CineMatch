# CineMatch Technical Guide

## 1. System Architecture
CineMatch is a multi-layered movie discovery engine that combines a high-performance web interface with advanced machine learning models for content-based filtering.

### 1.1 Components
- **Frontend**: A modern, responsive SPA (Single Page Application) built with HTML5, CSS3 (Glassmorphism), and Vanilla JavaScript.
- **Backend (API)**: Flask server providing access to recommendation models.
- **ML Engine**: Python-based engine using Scikit-Learn for text vectorization and similarity computation.
- **Data Source**: TMDB 5000 Movies Dataset and a custom Indian Movies Dataset.

## 2. Machine Learning Pipeline

### 2.1 Feature Engineering
The system utilizes a "Combined Features" approach:
- **Genre Weighting**: Genres are weighted 3x to ensure categorical relevance.
- **Keyword Weighting**: Keywords are weighted 2x.
- **Contextual Meta**: Director and Cast names are included to capture franchise and star-power relationships.
- **Overview**: Raw plot summaries provide the narrative context.

### 2.2 Vectorization Models
Two primary models are implemented for comparison:
1. **TF-IDF (Term Frequency-Inverse Document Frequency)**:
   - Best for capturing unique narrative themes.
   - Reduces the weight of common cinematic terms (e.g., "film", "story").
2. **CountVectorizer**:
   - Focuses on raw keyword overlap.
   - Highly effective for franchise detection where specific proper nouns (e.g., "Batman") are critical.

### 2.3 Similarity Metric
- **Cosine Similarity**: Measures the cosine of the angle between two vectors in a high-dimensional space.
- **Formula**: `cos(θ) = (A · B) / (||A|| ||B||)`

## 3. Installation and Setup

### 3.1 Prerequisites
- Python 3.8+
- Required Libraries: `pandas`, `scikit-learn`, `flask`, `matplotlib`, `seaborn`

### 3.2 Running the Application
1. **Prepare Data**: Run `python data_loader.py` to initialize datasets.
2. **Generate Visualizations**: Run `python generate_visualizations.py` to update graphs.
3. **Start Web App**: Run `python app.py`.
4. **Access**: Navigate to `http://localhost:5000` in your browser.

## 4. API Reference

### `GET /recommend?title=<title>&model=<tfidf|count>`
*Returns top 6 recommendations for the specified title using the selected model.*

### `GET /visualizations/<filename>`
*Access generated analytics graphs.*

## 5. Performance Benchmarks
- **Initialization Time**: ~3-5 seconds (loading 10k+ movies).
- **Inference Time**: <50ms per recommendation.
- **Accuracy**: >95% similarity for direct sequels.
