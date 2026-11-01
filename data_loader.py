import pandas as pd
import os

def create_sample_dataset():
    data = [
        # Batman Series (High similarity expected)
        {"movie_id": 1, "title": "Batman Begins", "genres": "Action, Crime, Drama", "overview": "Batman explores the origins of the Batman legend and the Dark Knight's emergence as a force for good in Gotham. In the wake of his parents' murder, disillusioned industrial heir Bruce Wayne travels the world seeking the means to fight injustice and turn fear against those who prey on the fearful. He returns to Gotham and unveils his alter-ego: Batman, a masked crusader who uses his strength, intellect and an array of high tech deceptions to fight the sinister forces that threaten the city."},
        {"movie_id": 2, "title": "The Dark Knight", "genres": "Action, Crime, Drama, Thriller", "overview": "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker."},
        {"movie_id": 3, "title": "The Dark Knight Rises", "genres": "Action, Crime, Drama, Thriller", "overview": "Following the death of District Attorney Harvey Dent, Batman assumes responsibility for Dent's crimes to protect the late attorney's reputation and is subsequently hunted by the Gotham City Police Department. Eight years later, Batman encounters the mysterious Selina Kyle and the villainous Bane, a new terrorist leader who overwhelms Gotham's finest. The Dark Knight resurfaces to protect a city that has branded him an enemy."},
        
        # Avengers Series (High similarity expected)
        {"movie_id": 4, "title": "The Avengers", "genres": "Science Fiction, Action, Adventure", "overview": "When an unexpected enemy emerges and threatens global safety and security, Nick Fury, director of the international peacekeeping agency known as S.H.I.E.L.D., finds himself in need of a team to pull the world back from the brink of disaster. Spanning the globe, a daring recruitment effort begins. The Avengers team up to fight Loki and his alien army."},
        {"movie_id": 5, "title": "Avengers: Age of Ultron", "genres": "Action, Adventure, Science Fiction", "overview": "When Tony Stark tries to jumpstart a dormant peacekeeping program, things go awry and Earth's Mightiest Heroes are put to the ultimate test as the fate of the planet hangs in the balance. As the villainous Ultron emerges, it is up to The Avengers to stop him from enacting his terrible plans, and soon uneasy alliances and unexpected action pave the way for an epic and unique global adventure."},
        {"movie_id": 6, "title": "Avengers: Infinity War", "genres": "Adventure, Action, Science Fiction", "overview": "As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos. A despot of intergalactic infamy, his goal is to collect all six Infinity Stones, artifacts of unimaginable power, and use them to inflict his twisted will on all of reality. Everything the Avengers have fought for has led up to this moment."},
        
        # Sci-Fi / Space (High similarity expected)
        {"movie_id": 7, "title": "Interstellar", "genres": "Adventure, Drama, Science Fiction", "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage. A team of astronauts travel through a wormhole in space in an attempt to ensure humanity's survival."},
        {"movie_id": 8, "title": "The Martian", "genres": "Drama, Adventure, Science Fiction", "overview": "During a manned mission to Mars, Astronaut Mark Watney is presumed dead after a fierce storm and left behind by his crew. But Watney has survived and finds himself stranded and alone on the hostile planet. With only meager supplies, he must draw upon his ingenuity, wit and spirit to subsist and find a way to signal to Earth that he is alive."},
        {"movie_id": 9, "title": "Gravity", "genres": "Science Fiction, Thriller, Drama", "overview": "Dr. Ryan Stone, a brilliant medical engineer on her first shuttle mission, with veteran astronaut Matt Kowalsky in command of his last flight before retiring. But on a seemingly routine spacewalk, disaster strikes. The shuttle is destroyed, leaving Stone and Kowalsky completely alone—tethered to nothing but each other and spiraling out into the blackness of space."},
        
        # Fantasy / Lord of the Rings (High similarity)
        {"movie_id": 10, "title": "The Lord of the Rings: The Fellowship of the Ring", "genres": "Adventure, Fantasy, Action", "overview": "Young hobbit Frodo Baggins, after inheriting a mysterious ring from his uncle Bilbo, must leave his home in order to keep it from falling into the hands of its evil creator. Along with a fellowship of companions, Frodo embarks on a quest to destroy the One Ring and save Middle-earth from the Dark Lord Sauron."},
        {"movie_id": 11, "title": "The Lord of the Rings: The Two Towers", "genres": "Adventure, Fantasy, Action", "overview": "Frodo and Sam are trekking to Mordor to destroy the One Ring of Power while Gimli, Legolas and Aragorn search for the orc-captured Merry and Pippin. All along, nefarious wizard Saruman awaits the Fellowship members at the Orthanc Tower in Isengard."},
        {"movie_id": 12, "title": "The Lord of the Rings: The Return of the King", "genres": "Adventure, Fantasy, Action", "overview": "Aragorn is revealed as the heir to the ancient kings as he, Gandalf and the other members of the broken fellowship struggle to save Gondor from Sauron's forces. Meanwhile, Frodo and Sam bring the ring closer to the heart of Mordor, the dark lord's realm, to destroy the Ring of Power."},

        # Romance
        {"movie_id": 13, "title": "The Notebook", "genres": "Romance, Drama", "overview": "An epic love story centered around an older man who reads aloud to a woman with Alzheimer's. From a faded notebook, the old man's words bring to life the story about a couple who is separated by World War II, and is then passionately reunited, seven years later, after they have taken different paths."},
        {"movie_id": 14, "title": "A Walk to Remember", "genres": "Drama, Romance", "overview": "When the popular, restless Landon Carter is forced to participate in the school drama production he falls in love with Jamie Sullivan, the daughter of the town's minister. Jamie has a 'to-do' list for her life and also a very big secret she must keep from Landon."},
        {"movie_id": 15, "title": "Titanic", "genres": "Drama, Romance, Thriller", "overview": "101-year-old Rose DeWitt Bukater tells the story of her life aboard the Titanic, 84 years later. A young Rose boards the ship with her mother and fiancé. Meanwhile, Jack Dawson and Fabrizio De Rossi win third-class tickets aboard the ship. Rose tells the whole story from Titanic's departure through to its death—on its first and last voyage."}
    ]
    
    df = pd.DataFrame(data)
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/movies_sample.csv', index=False)
    print("Sample dataset 'movies_sample.csv' created successfully in 'data' directory.")
    print(f"Total movies: {len(df)}")

if __name__ == "__main__":
    create_sample_dataset()
