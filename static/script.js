/* ==========================================================================
   CineMatch Frontend Engine
   Integrates Scikit-Learn NLP Recommendations with Live TMDB Discovery
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('movie-search');
    const searchBtn = document.getElementById('search-btn');
    const autocompleteList = document.getElementById('autocomplete-list');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingText = document.getElementById('loading-text');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const resultsSection = document.getElementById('results-section');
    const moviesGrid = document.getElementById('movies-grid');
    const targetMovieTitle = document.getElementById('target-movie-title');
    const resultsMeta = document.getElementById('results-meta');
    const franchiseSection = document.getElementById('franchise-section');
    const franchiseGrid = document.getElementById('franchise-grid');
    const movieCartContainer = document.getElementById('movie-cart');
    const blendModeToggle = document.getElementById('blend-mode-toggle');
    const currentModelBadge = document.getElementById('current-model-badge');
    const enginePills = document.querySelectorAll('.engine-pill');
    const quickChips = document.querySelectorAll('.chip');
    
    // State
    let activeEngine = 'tmdb'; // 'tmdb', 'local-tfidf', 'local-count'
    let collectionMovieIds = [];
    let movieCart = [];
    let debounceTimer;
    let genreMap = {};
    
    const API_KEY = "36ba824d448e6b9f43f5bcc38235329b";
    
    const langMap = {
        'hi': 'Hindi', 'kn': 'Kannada', 'te': 'Telugu', 'ta': 'Tamil', 
        'ml': 'Malayalam', 'bn': 'Bengali', 'mr': 'Marathi', 'en': 'English',
        'ko': 'Korean', 'ja': 'Japanese', 'fr': 'French', 'es': 'Spanish',
        'it': 'Italian', 'de': 'German', 'zh': 'Chinese', 'pa': 'Punjabi',
        'gu': 'Gujarati', 'ur': 'Urdu', 'or': 'Odia'
    };

    // Initialize TMDB Genre Map
    fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=en-US`)
        .then(res => res.json())
        .then(data => {
            if (data.genres) {
                data.genres.forEach(g => genreMap[g.id] = g.name);
            }
        })
        .catch(err => console.warn("TMDB Genre map initialization skipped:", err));

    // Engine Selection Pills
    enginePills.forEach(pill => {
        pill.addEventListener('click', () => {
            enginePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeEngine = pill.getAttribute('data-engine');
            
            if (activeEngine === 'tmdb') {
                currentModelBadge.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Live Discovery</span>';
            } else if (activeEngine === 'local-tfidf') {
                currentModelBadge.innerHTML = '<i class="fa-solid fa-brain"></i> <span>Scikit-Learn TF-IDF</span>';
            } else if (activeEngine === 'local-count') {
                currentModelBadge.innerHTML = '<i class="fa-solid fa-calculator"></i> <span>CountVectorizer</span>';
            }

            // Re-trigger current search if already showing results
            const currentTitle = targetMovieTitle.textContent.trim();
            if (currentTitle && !resultsSection.classList.contains('hidden')) {
                dispatchRecommendation(currentTitle, null);
            }
        });
    });

    // Quick Suggestion Chips
    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const movie = chip.getAttribute('data-movie');
            searchInput.value = movie;
            if (blendModeToggle.checked) {
                // Add to blend cart
                fetchMovieMetaAndAddToCart(movie);
            } else {
                dispatchRecommendation(movie, null);
            }
        });
    });

    // Autocomplete with Debounce
    searchInput.addEventListener('input', function() {
        const val = this.value;
        closeAllLists();
        if (!val || val.length < 2) return false;
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(val)}&include_adult=false`)
                .then(res => res.ok ? res.json() : { results: [] })
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        showAutocomplete(data.results.slice(0, 8), val);
                    }
                })
                .catch(err => console.error("Search failed:", err));
        }, 280);
    });

    function showAutocomplete(movies, val) {
        closeAllLists();
        const listDiv = document.createElement("div");
        listDiv.setAttribute("id", searchInput.id + "-autocomplete-list");
        listDiv.setAttribute("class", "autocomplete-items");
        
        movies.forEach(movie => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "autocomplete-item";
            
            const year = movie.release_date ? movie.release_date.split('-')[0] : 'Unknown';
            const originalLang = movie.original_language || 'unknown';
            const lang = langMap[originalLang] || originalLang.toUpperCase();
            
            const titleUpper = movie.title.toUpperCase();
            const valUpper = val.toUpperCase();
            
            if (titleUpper.startsWith(valUpper)) {
                itemDiv.innerHTML = `<strong>${movie.title.substr(0, val.length)}</strong>${movie.title.substr(val.length)}`;
            } else {
                itemDiv.innerHTML = movie.title;
            }
            itemDiv.innerHTML += ` <span style="color:#a5b4fc; font-size:0.8rem;">(${year} &bull; ${lang})</span>`;
            
            itemDiv.innerHTML += `<input type='hidden' data-id='${movie.id}' value='${movie.title.replace(/'/g, "&#39;")}'>`;
            
            itemDiv.addEventListener("click", function() {
                const hiddenInput = this.querySelector("input");
                const movieId = hiddenInput.getAttribute("data-id");
                const movieTitle = hiddenInput.value;
                closeAllLists();
                
                if (blendModeToggle.checked) {
                    addToCart(movieId, movieTitle);
                } else {
                    searchInput.value = movieTitle;
                    dispatchRecommendation(movieTitle, movieId);
                }
            });
            listDiv.appendChild(itemDiv);
        });
        
        listDiv.style.display = "block";
        searchInput.parentNode.appendChild(listDiv);
    }

    function closeAllLists(elmnt) {
        const items = document.querySelectorAll(".autocomplete-items");
        items.forEach(item => {
            if (elmnt !== item && elmnt !== searchInput) {
                item.remove();
            }
        });
    }

    document.addEventListener("click", (e) => closeAllLists(e.target));

    // Taste Blender Cart UI
    function renderCart() {
        if (movieCart.length === 0) {
            movieCartContainer.classList.add('hidden');
            return;
        }
        
        movieCartContainer.innerHTML = '';
        movieCart.forEach(movie => {
            const item = document.createElement('div');
            item.className = 'cart-item';
            item.innerHTML = `
                <span><i class="fa-solid fa-film"></i> ${movie.title}</span>
                <button class="remove-btn" aria-label="Remove ${movie.title}"><i class="fa-solid fa-xmark"></i></button>
            `;
            
            item.querySelector('.remove-btn').addEventListener('click', () => {
                movieCart = movieCart.filter(m => m.id !== movie.id);
                renderCart();
            });
            
            movieCartContainer.appendChild(item);
        });
        
        movieCartContainer.classList.remove('hidden');
    }

    function addToCart(id, title) {
        if (movieCart.find(m => m.id == id)) return;
        if (movieCart.length >= 5) {
            alert("Taste Blender supports blending up to 5 movies concurrently.");
            return;
        }
        movieCart.push({ id, title });
        searchInput.value = '';
        renderCart();
    }

    function fetchMovieMetaAndAddToCart(title) {
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`)
            .then(res => res.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    addToCart(data.results[0].id, data.results[0].title);
                }
            });
    }

    blendModeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            searchInput.placeholder = "Select or search movies to add into Taste Blender...";
        } else {
            searchInput.placeholder = "Type a movie you love... (e.g., The Dark Knight, Interstellar)";
            movieCart = [];
            renderCart();
        }
    });

    // Central Recommendation Dispatcher
    function dispatchRecommendation(movieTitle, movieId = null) {
        if (activeEngine.startsWith('local-')) {
            const modelType = activeEngine === 'local-count' ? 'count' : 'tfidf';
            getLocalMlRecommendations(movieTitle, modelType);
        } else {
            if (movieId) {
                getTmdbRecommendations(movieId, movieTitle);
            } else {
                fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movieTitle)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.results && data.results.length > 0) {
                            getTmdbRecommendations(data.results[0].id, data.results[0].title);
                        } else {
                            // Fallback to local ML model if not found on TMDB
                            getLocalMlRecommendations(movieTitle, 'tfidf');
                        }
                    })
                    .catch(() => getLocalMlRecommendations(movieTitle, 'tfidf'));
            }
        }
    }

    searchBtn.addEventListener('click', () => {
        if (!blendModeToggle.checked || movieCart.length === 0) {
            const val = searchInput.value.trim();
            if (!val) return;
            dispatchRecommendation(val, null);
        } else if (movieCart.length === 1) {
            dispatchRecommendation(movieCart[0].title, movieCart[0].id);
        } else {
            getBlendedRecommendations();
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            closeAllLists();
            const val = searchInput.value.trim();
            if (!val) return;
            
            if (blendModeToggle.checked) {
                fetchMovieMetaAndAddToCart(val);
            } else {
                searchBtn.click();
            }
        }
    });

    // --- Local ML Recommendation via Flask API ---
    function getLocalMlRecommendations(movieTitle, modelType = 'tfidf') {
        resultsSection.classList.add('hidden');
        franchiseSection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        loadingText.textContent = `Computing cosine similarity vectors (${modelType.toUpperCase()})...`;
        moviesGrid.innerHTML = '';

        fetch(`/api/recommend?title=${encodeURIComponent(movieTitle)}&model=${modelType}`)
            .then(res => {
                if (!res.ok) throw new Error("Local recommender endpoint returned an error");
                return res.json();
            })
            .then(data => {
                loadingSpinner.classList.add('hidden');
                if (data.error) {
                    errorText.textContent = data.error;
                    errorMessage.classList.remove('hidden');
                    return;
                }
                
                const recs = data.recommendations || [];
                if (recs.length === 0) {
                    errorText.textContent = `No local ML recommendations found for '${movieTitle}'.`;
                    errorMessage.classList.remove('hidden');
                    return;
                }

                resultsMeta.textContent = `Ranked with Scikit-Learn ${modelType === 'tfidf' ? 'TF-IDF' : 'CountVectorizer'} Vectorizer & Cosine Similarity`;
                displayLocalMlResults(data.target_title || movieTitle, recs, modelType);
            })
            .catch(err => {
                loadingSpinner.classList.add('hidden');
                console.error("Local ML error:", err);
                errorText.textContent = "Could not connect to local ML recommender service.";
                errorMessage.classList.remove('hidden');
            });
    }

    function displayLocalMlResults(targetTitle, recommendations, modelType) {
        targetMovieTitle.textContent = targetTitle;
        
        recommendations.forEach((rec, index) => {
            const delay = index * 0.08;
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.style.animation = `fadeUp 0.5s ease forwards ${delay}s`;
            card.style.opacity = '0';
            
            const posterDiv = document.createElement('div');
            posterDiv.className = 'movie-poster placeholder-poster';
            posterDiv.innerHTML = '<i class="fa-solid fa-film"></i>';
            card.appendChild(posterDiv);

            // Fetch poster asynchronously
            fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(rec.title)}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data && data.results && data.results.length > 0 && data.results[0].poster_path) {
                        const img = document.createElement('img');
                        img.src = `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
                        img.alt = `${rec.title} poster`;
                        img.className = 'movie-poster';
                        posterDiv.replaceWith(img);
                    }
                }).catch(() => {});

            // Shared keywords tags
            const sharedTags = rec.shared_keywords
                ? rec.shared_keywords.split(',').map(k => `<span class="tag tag-highlight">#${k.trim()}</span>`).join(' ')
                : `<span class="tag">Genre Overlap</span>`;

            const ratingDisplay = rec.rating && rec.rating !== 'N/A' && rec.rating !== 'nan' 
                ? `&bull; <i class="fa-solid fa-star" style="color: #fbbf24; font-size: 0.8rem;"></i> ${rec.rating}` 
                : '';

            const content = document.createElement('div');
            content.className = 'card-content';
            content.innerHTML = `
                <div class="card-header">
                    <div>
                        <h3 class="movie-title">${rec.title}</h3>
                        <span class="movie-year">${rec.year || 'Unknown'} ${ratingDisplay}</span>
                    </div>
                    <div class="similarity-badge">${rec.score}% Match</div>
                </div>
                <p class="movie-genres">${rec.genres || 'Categorical Match'}</p>
                <div class="reason-box">
                    <div class="reason-tags">
                        ${sharedTags}
                    </div>
                </div>
            `;
            
            card.appendChild(content);
            moviesGrid.appendChild(card);
        });

        resultsSection.classList.remove('hidden');
        setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }

    // --- TMDB Live Discovery Engine ---
    function getTmdbRecommendations(movieId, movieTitle) {
        resultsSection.classList.add('hidden');
        franchiseSection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        loadingText.textContent = "Analyzing global TMDB metadata & franchise clusters...";
        moviesGrid.innerHTML = '';
        franchiseGrid.innerHTML = '';
        collectionMovieIds = [];

        fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=en-US&append_to_response=keywords`)
            .then(res => {
                if (!res.ok) throw new Error("Could not fetch movie details");
                return res.json();
            })
            .then(movieData => {
                if (!movieData.id) throw new Error("Movie details not found");

                const originalLanguage = movieData.original_language;
                const allGenreIds = movieData.genres ? movieData.genres.map(g => g.id) : [];
                const top2GenreIds = allGenreIds.slice(0, 2);
                const isAnimation = allGenreIds.includes(16);
                
                const keywordIds = movieData.keywords && movieData.keywords.keywords 
                    ? movieData.keywords.keywords.slice(0, 5).map(k => k.id).join('|') 
                    : '';

                const buildUrl = (strictMatch, forceLanguage = true) => {
                    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&vote_count.gte=100&vote_average.gte=5`;
                    if (forceLanguage) url += `&with_original_language=${originalLanguage}`;
                    if (!isAnimation) url += `&without_genres=16`;

                    if (strictMatch) {
                        if (top2GenreIds.length > 0) url += `&with_genres=${top2GenreIds.join(',')}`;
                        if (keywordIds) url += `&with_keywords=${keywordIds}`;
                    } else {
                        if (allGenreIds.length > 0) url += `&with_genres=${allGenreIds.join('|')}`;
                    }
                    return url;
                };

                const discoverPromise = fetch(buildUrl(true))
                    .then(res => res.ok ? res.json() : { results: [] })
                    .then(data => {
                        if (!data.results || data.results.length < 5) {
                            return fetch(buildUrl(false)).then(res => res.ok ? res.json() : { results: [] });
                        }
                        return data;
                    })
                    .then(data => {
                        if (!data.results || data.results.length < 5) {
                            return fetch(buildUrl(false, false)).then(res => res.ok ? res.json() : { results: [] });
                        }
                        return data;
                    });
                    
                let franchisePromise = Promise.resolve();
                if (movieData.belongs_to_collection) {
                    franchisePromise = fetch(`https://api.themoviedb.org/3/collection/${movieData.belongs_to_collection.id}?api_key=${API_KEY}`)
                        .then(res => res.json())
                        .then(colData => {
                            if (colData.parts && colData.parts.length > 1) {
                                colData.parts.sort((a,b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
                                collectionMovieIds = colData.parts.map(p => p.id);
                                displayFranchise(colData.parts, movieId);
                            }
                        });
                }

                return Promise.all([franchisePromise, discoverPromise]);
            })
            .then(results => {
                const data = results[1];
                loadingSpinner.classList.add('hidden');
                
                if (data.results && data.results.length > 0) {
                    const filteredResults = data.results.filter(m => m.id != movieId && !collectionMovieIds.includes(m.id));
                    resultsMeta.textContent = "Ranked with TMDB Multi-Feature Discovery & Keyword Vectors";
                    displayTmdbResults(movieTitle, filteredResults.slice(0, 6));
                } else {
                    errorText.textContent = `No recommendations found for '${movieTitle}'.`;
                    errorMessage.classList.remove('hidden');
                }
            })
            .catch(err => {
                loadingSpinner.classList.add('hidden');
                errorText.textContent = "Failed to fetch recommendations.";
                errorMessage.classList.remove('hidden');
                console.error(err);
            });
    }

    function displayTmdbResults(targetTitle, recommendations) {
        targetMovieTitle.textContent = targetTitle;
        
        recommendations.forEach((rec, index) => {
            const delay = index * 0.08;
            const year = rec.release_date ? rec.release_date.split('-')[0] : 'Unknown';
            const rating = rec.vote_average ? rec.vote_average.toFixed(1) : 'N/A';
            const score = rec.vote_average ? Math.round(rec.vote_average * 10) : 0;
            
            const genresStr = rec.genre_ids 
                ? rec.genre_ids.map(id => genreMap[id] || '').filter(Boolean).join(', ')
                : 'Cinema';

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.style.animation = `fadeUp 0.5s ease forwards ${delay}s`;
            card.style.opacity = '0';
            
            const posterHtml = rec.poster_path 
                ? `<img src="https://image.tmdb.org/t/p/w500${rec.poster_path}" alt="${rec.title} poster" class="movie-poster">` 
                : `<div class="movie-poster placeholder-poster"><i class="fa-solid fa-film"></i></div>`;

            card.innerHTML = `
                ${posterHtml}
                <div class="card-content">
                    <div class="card-header">
                        <div>
                            <h3 class="movie-title">${rec.title}</h3>
                            <span class="movie-year">${year} &bull; <i class="fa-solid fa-star" style="color: #fbbf24; font-size: 0.8rem;"></i> ${rating}</span>
                        </div>
                        <div class="similarity-badge">${score}% Match</div>
                    </div>
                    <p class="movie-genres">${genresStr}</p>
                    <div class="reason-box">
                        <div class="reason-tags">
                            <span class="tag tag-highlight"><i class="fa-solid fa-globe"></i> Thematic & Genre Match</span>
                        </div>
                    </div>
                </div>
            `;
            
            moviesGrid.appendChild(card);
        });
        
        resultsSection.classList.remove('hidden');
        setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }

    function getBlendedRecommendations() {
        resultsSection.classList.add('hidden');
        franchiseSection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        loadingText.textContent = `Blending vectors from ${movieCart.length} movies...`;
        moviesGrid.innerHTML = '';
        franchiseGrid.innerHTML = '';

        const fetchPromises = movieCart.map(movie => {
            return fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=en-US&append_to_response=keywords`)
                .then(res => res.ok ? res.json() : { results: [] })
                .then(movieData => {
                    if (!movieData.id) return { results: [] };

                    const originalLanguage = movieData.original_language;
                    const allGenreIds = movieData.genres ? movieData.genres.map(g => g.id) : [];
                    const top2GenreIds = allGenreIds.slice(0, 2);
                    const isAnimation = allGenreIds.includes(16);
                    
                    const keywordIds = movieData.keywords && movieData.keywords.keywords 
                        ? movieData.keywords.keywords.slice(0, 5).map(k => k.id).join('|') 
                        : '';

                    const buildUrl = (strictMatch, forceLanguage = true) => {
                        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&vote_count.gte=100&vote_average.gte=5`;
                        if (forceLanguage) url += `&with_original_language=${originalLanguage}`;
                        if (!isAnimation) url += `&without_genres=16`; 

                        if (strictMatch) {
                            if (top2GenreIds.length > 0) url += `&with_genres=${top2GenreIds.join(',')}`;
                            if (keywordIds) url += `&with_keywords=${keywordIds}`;
                        } else {
                            if (allGenreIds.length > 0) url += `&with_genres=${allGenreIds.join('|')}`;
                        }
                        return url;
                    };

                    return fetch(buildUrl(true))
                        .then(res => res.ok ? res.json() : { results: [] })
                        .then(data => {
                            if (!data.results || data.results.length < 5) return fetch(buildUrl(false)).then(res => res.ok ? res.json() : { results: [] });
                            return data;
                        })
                        .then(data => {
                            if (!data.results || data.results.length < 5) return fetch(buildUrl(false, false)).then(res => res.ok ? res.json() : { results: [] });
                            return data;
                        });
                }).catch(() => ({ results: [] }));
        });

        Promise.all(fetchPromises)
            .then(resultsArray => {
                loadingSpinner.classList.add('hidden');
                
                let blendedMovies = [];
                let maxLen = Math.max(...resultsArray.map(r => r.results ? r.results.length : 0));
                let seenIds = new Set(movieCart.map(m => parseInt(m.id)));
                
                for (let i = 0; i < maxLen; i++) {
                    for (let j = 0; j < resultsArray.length; j++) {
                        const recs = resultsArray[j].results || [];
                        if (i < recs.length) {
                            const movie = recs[i];
                            if (!seenIds.has(movie.id)) {
                                blendedMovies.push(movie);
                                seenIds.add(movie.id);
                            }
                        }
                    }
                }

                if (blendedMovies.length > 0) {
                    const blendTitle = `${movieCart.map(m => m.title).join(' + ')}`;
                    resultsMeta.textContent = `Taste Blender Matrix: Combined features across ${movieCart.length} titles`;
                    displayTmdbResults(blendTitle, blendedMovies.slice(0, 8));
                } else {
                    errorText.textContent = "Could not find a blend for these movies.";
                    errorMessage.classList.remove('hidden');
                }
            })
            .catch(() => {
                loadingSpinner.classList.add('hidden');
                errorText.textContent = "Failed to blend movie selections.";
                errorMessage.classList.remove('hidden');
            });
    }

    function displayFranchise(parts, currentMovieId) {
        parts.forEach((rec, index) => {
            const delay = index * 0.08;
            const year = rec.release_date ? rec.release_date.split('-')[0] : 'Unknown';
            const rating = rec.vote_average ? rec.vote_average.toFixed(1) : 'N/A';
            const isCurrent = rec.id == currentMovieId;
            
            const card = document.createElement('div');
            card.className = 'movie-card';
            if (isCurrent) {
                card.style.border = '2px solid #f59e0b';
                card.style.transform = 'scale(1.02)';
            }
            card.style.animation = `fadeUp 0.5s ease forwards ${delay}s`;
            card.style.opacity = '0';
            
            const posterHtml = rec.poster_path 
                ? `<img src="https://image.tmdb.org/t/p/w500${rec.poster_path}" alt="${rec.title} poster" class="movie-poster">` 
                : `<div class="movie-poster placeholder-poster"><i class="fa-solid fa-film"></i></div>`;

            card.innerHTML = `
                ${posterHtml}
                <div class="card-content">
                    <div class="card-header">
                        <div>
                            <h3 class="movie-title">${rec.title} ${isCurrent ? '<span style="color:#f59e0b; font-size:0.75rem;">(Current)</span>' : ''}</h3>
                            <span class="movie-year">${year} &bull; <i class="fa-solid fa-star" style="color: #fbbf24; font-size: 0.8rem;"></i> ${rating}</span>
                        </div>
                    </div>
                    <div class="reason-box">
                        <div class="reason-tags">
                            <span class="tag" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3);">
                                <i class="fa-solid fa-link"></i> Franchise Collection
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            franchiseGrid.appendChild(card);
        });
        
        franchiseSection.classList.remove('hidden');
    }

    // URL Query Parameter Handling (e.g. ?demo=dark_knight or ?movie=Inception)
    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get('demo');
    const movieParam = urlParams.get('movie') || urlParams.get('q');
    
    if (demoParam === 'dark_knight') {
        searchInput.value = 'The Dark Knight';
        dispatchRecommendation('The Dark Knight', 155);
    } else if (demoParam === 'blend') {
        blendModeToggle.checked = true;
        blendModeToggle.dispatchEvent(new Event('change'));
        movieCart = [
            { id: 155, title: 'The Dark Knight' },
            { id: 157336, title: 'Interstellar' },
            { id: 27205, title: 'Inception' }
        ];
        renderCart();
        getBlendedRecommendations();
    } else if (movieParam) {
        searchInput.value = movieParam;
        dispatchRecommendation(movieParam, null);
    }
});
