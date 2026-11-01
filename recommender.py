import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import ast
import re
import os

class MovieRecommender:
    def __init__(self, movies_path='data/tmdb_5000_movies.csv', credits_path='data/tmdb_5000_credits.csv', indian_movies_path='data/movies_data.csv'):
        """Initializes the recommender system by loading data and training models."""
        self.movies_path = movies_path
        self.credits_path = credits_path
        self.indian_movies_path = indian_movies_path
        
        print("Loading and preparing data. This may take a few seconds...")
        self.prepare_data()
        
        print("Building similarity models...")
        self.build_models()
        print("Recommender system initialized!")
        
    def prepare_data(self):
        """Cleans and combines text features for vectorization."""
        # --- LOAD TMDB DATA ---
        tmdb_movies = pd.read_csv(self.movies_path)
        tmdb_credits = pd.read_csv(self.credits_path)
        
        # Merge datasets on id
        tmdb_df = tmdb_movies.merge(tmdb_credits, left_on='id', right_on='movie_id')
        tmdb_df = tmdb_df.dropna(subset=['title_x'])
        
        def extract_names(obj_str):
            try:
                if pd.isna(obj_str): return ""
                L = ast.literal_eval(obj_str)
                return " ".join([i['name'].replace(" ", "") for i in L])
            except:
                return ""
                
        def extract_top3_cast(obj_str):
            try:
                if pd.isna(obj_str): return ""
                L = ast.literal_eval(obj_str)
                return " ".join([i['name'].replace(" ", "") for i in L[:3]])
            except:
                return ""

        def extract_director(obj_str):
            try:
                if pd.isna(obj_str): return ""
                L = ast.literal_eval(obj_str)
                for i in L:
                    if i['job'] == 'Director':
                        return i['name'].replace(" ", "")
                return ""
            except:
                return ""

        tmdb_df['genres_processed'] = tmdb_df['genres'].apply(extract_names)
        tmdb_df['keywords_processed'] = tmdb_df['keywords'].apply(extract_names)
        tmdb_df['cast_processed'] = tmdb_df['cast'].apply(extract_top3_cast)
        tmdb_df['director_processed'] = tmdb_df['crew'].apply(extract_director)
        tmdb_df['overview'] = tmdb_df['overview'].fillna('')
        tmdb_df['title'] = tmdb_df['title_x']
        tmdb_df['release_date'] = tmdb_df['release_date'].astype(str)
        tmdb_df['vote_average'] = tmdb_df['vote_average']
        
        # --- LOAD INDIAN MOVIES DATA ---
        try:
            indian_df = pd.read_csv(self.indian_movies_path)
            indian_df = indian_df.dropna(subset=['Name'])
            
            indian_df['title'] = indian_df['Name']
            
            def process_indian_genres(x):
                if pd.isna(x): return ""
                return " ".join([g.strip().replace(" ", "") for g in str(x).split(',')])
                
            def process_indian_cast(row):
                cast = []
                for col in ['Actor 1', 'Actor 2', 'Actor 3']:
                    if not pd.isna(row[col]):
                        cast.append(str(row[col]).strip().replace(" ", ""))
                return " ".join(cast)
                
            indian_df['genres_processed'] = indian_df['Genre'].apply(process_indian_genres)
            indian_df['keywords_processed'] = ""
            indian_df['cast_processed'] = indian_df.apply(process_indian_cast, axis=1)
            indian_df['director_processed'] = indian_df['Director'].apply(lambda x: str(x).replace(" ", "") if not pd.isna(x) else "")
            indian_df['overview'] = ""
            indian_df['release_date'] = indian_df['Year'].astype(str).str.replace(".0", "", regex=False)
            indian_df['vote_average'] = indian_df['Rating']
            
        except Exception as e:
            print(f"Failed to load Indian movies: {e}")
            indian_df = pd.DataFrame()
            
        # Keep only required columns
        cols = ['title', 'genres_processed', 'keywords_processed', 'cast_processed', 'director_processed', 'overview', 'release_date', 'vote_average']
        
        # Combine
        if not indian_df.empty:
            self.df = pd.concat([tmdb_df[cols], indian_df[cols]], ignore_index=True)
        else:
            self.df = tmdb_df[cols]
            
        # Drop duplicates by title just in case
        self.df = self.df.drop_duplicates(subset=['title']).reset_index(drop=True)
        
        # Build combined features
        self.df['combined_features'] = (self.df['genres_processed'] + " ") * 3 + \
                                       (self.df['keywords_processed'] + " ") * 2 + \
                                       (self.df['cast_processed'] + " ") * 2 + \
                                       (self.df['director_processed'] + " ") * 2 + \
                                       self.df['overview']
        
        # Simple text cleaning (lowercase, remove punctuation)
        self.df['combined_features'] = self.df['combined_features'].apply(
            lambda x: re.sub(r'[^\w\s]', '', str(x).lower())
        )
        print(f"Total movies processed: {len(self.df)}")
        
    def build_models(self):
        """Builds TF-IDF and CountVectorizer models and their similarity matrices."""
        # Use max_features to limit memory usage
        self.tfidf = TfidfVectorizer(stop_words='english', max_features=12000)
        self.tfidf_matrix = self.tfidf.fit_transform(self.df['combined_features'])
        
        self.count_vec = CountVectorizer(stop_words='english', max_features=12000)
        self.count_matrix = self.count_vec.fit_transform(self.df['combined_features'])
        
        # We don't precompute the entire similarity matrix to save memory, 
        # instead we compute similarity on the fly for the target movie.
        
        # Helper to map titles to indices
        self.indices = pd.Series(self.df.index, index=self.df['title'].str.lower()).drop_duplicates()
        
    def get_shared_keywords(self, text1, text2):
        """Helper to find overlapping words to explain similarity."""
        words1 = set(text1.split())
        words2 = set(text2.split())
        shared = words1.intersection(words2)
        # Filter out common stop words manually for explanation clarity
        stop_words = set(self.tfidf.get_stop_words())
        meaningful_shared = [w for w in shared if w not in stop_words and len(w) > 2]
        return ", ".join(list(meaningful_shared)[:5]) # Return up to 5 shared words

    def get_recommendations(self, title, model_type='tfidf', top_k=6):
        """
        Gets top_k recommendations for a given movie title.
        model_type: 'tfidf' or 'count'
        Returns a list of dicts.
        """
        title_lower = title.lower()
        if title_lower not in self.indices:
            return {"error": f"Movie '{title}' not found in the dataset."}
        
        # Handle duplicates if any
        idx = self.indices[title_lower]
        if type(idx) is pd.Series:
            idx = idx.iloc[0]
            
        target_features = self.df.iloc[idx]['combined_features']
        
        # Compute similarity on the fly
        if model_type == 'tfidf':
            target_vec = self.tfidf_matrix[idx]
            sim_scores = cosine_similarity(target_vec, self.tfidf_matrix).flatten()
        else:
            target_vec = self.count_matrix[idx]
            sim_scores = cosine_similarity(target_vec, self.count_matrix).flatten()
            
        # Get indices of top_k + 1 (including itself)
        # argpartition is faster than argsort for finding top K
        top_indices = sim_scores.argsort()[-(top_k+1):][::-1]
        
        # Filter out the movie itself
        movie_indices = [i for i in top_indices if i != idx][:top_k]
        scores = [sim_scores[i] for i in movie_indices]
        
        recommendations = []
        for i, (m_idx, score) in enumerate(zip(movie_indices, scores)):
            rec_title = self.df.iloc[m_idx]['title']
            # Reformat genres back to readable
            rec_genres = ", ".join([g for g in self.df.iloc[m_idx]['genres_processed'].split() if g])
            rec_features = self.df.iloc[m_idx]['combined_features']
            
            # Additional metadata for UI
            release_date = str(self.df.iloc[m_idx].get('release_date', ''))
            year = release_date.split('-')[0] if release_date != 'nan' and release_date else 'Unknown'
            vote_avg = self.df.iloc[m_idx].get('vote_average', 'N/A')
            
            shared_words = self.get_shared_keywords(target_features, rec_features)
            
            recommendations.append({
                "title": rec_title,
                "score": round(score * 100, 1),
                "genres": rec_genres,
                "shared_keywords": shared_words,
                "year": year,
                "rating": vote_avg
            })
            
        return {"recommendations": recommendations, "target_title": self.df.iloc[idx]['title']}

if __name__ == "__main__":
    recommender = MovieRecommender()
    print("\n--- Testing Indian Movie ---")
    print(recommender.get_recommendations("3 Idiots"))
