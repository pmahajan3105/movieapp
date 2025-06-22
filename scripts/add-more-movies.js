const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const movies = [
  {
    title: 'Pulp Fiction',
    year: 1994,
    genre: ['Crime', 'Drama'],
    director: ['Quentin Tarantino'],
    plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    rating: 8.9,
    runtime: 154,
    imdb_id: 'tt0110912',
    tmdb_id: 680,
  },
  {
    title: 'The Dark Knight',
    year: 2008,
    genre: ['Action', 'Crime', 'Drama'],
    director: ['Christopher Nolan'],
    plot: 'When a menace known as the Joker emerges from his mysterious past, he wreaks havoc and chaos on the people of Gotham.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
    rating: 9.0,
    runtime: 152,
    imdb_id: 'tt0468569',
    tmdb_id: 155,
  },
  {
    title: 'Forrest Gump',
    year: 1994,
    genre: ['Drama', 'Romance'],
    director: ['Robert Zemeckis'],
    plot: 'The presidencies of Kennedy and Johnson, Vietnam, Watergate, and other history unfold through the perspective of an Alabama man with an IQ of 75.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg',
    rating: 8.8,
    runtime: 142,
    imdb_id: 'tt0109830',
    tmdb_id: 13,
  },
  {
    title: 'Inception',
    year: 2010,
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    director: ['Christopher Nolan'],
    plot: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',
    rating: 8.8,
    runtime: 148,
    imdb_id: 'tt1375666',
    tmdb_id: 27205,
  },
  {
    title: 'The Matrix',
    year: 1999,
    genre: ['Action', 'Sci-Fi'],
    director: ['Lana Wachowski', 'Lilly Wachowski'],
    plot: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    rating: 8.7,
    runtime: 136,
    imdb_id: 'tt0133093',
    tmdb_id: 603,
  },
  {
    title: 'Goodfellas',
    year: 1990,
    genre: ['Biography', 'Crime', 'Drama'],
    director: ['Martin Scorsese'],
    plot: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BY2NkZjEzMDgtN2RjYy00YzM1LWI4ZmQtMjIwYjFjNmI3ZGEwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
    rating: 8.7,
    runtime: 146,
    imdb_id: 'tt0099685',
    tmdb_id: 769,
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    year: 2003,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Peter Jackson'],
    plot: 'Gandalf and Aragorn lead the World of Men against Saurons army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BNzA5ZDNlZWMtM2NhNS00NDJjLTk4NDItYTRmY2EwMWI5MTktXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
    rating: 8.9,
    runtime: 201,
    imdb_id: 'tt0167260',
    tmdb_id: 122,
  },
  {
    title: 'Fight Club',
    year: 1999,
    genre: ['Drama'],
    director: ['David Fincher'],
    plot: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMmEzNTkxYjQtZTc0MC00YTVjLTg5ZTEtZWMwOWVlYzY0NWIwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
    rating: 8.8,
    runtime: 139,
    imdb_id: 'tt0137523',
    tmdb_id: 550,
  },
  {
    title: 'Star Wars: Episode V - The Empire Strikes Back',
    year: 1980,
    genre: ['Action', 'Adventure', 'Fantasy'],
    director: ['Irvin Kershner'],
    plot: 'After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BYmU1NDRjNDgtMzhiMi00NjZmLTg5NGItZDNiZjU5NTU4OTE0XkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
    rating: 8.7,
    runtime: 124,
    imdb_id: 'tt0080684',
    tmdb_id: 1891,
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    year: 2001,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Peter Jackson'],
    plot: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth from the Dark Lord Sauron.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzUtNWUzMi00MTgxLWI0NTctMzY4M2VlOTdjZWRiXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_SX300.jpg',
    rating: 8.8,
    runtime: 178,
    imdb_id: 'tt0120737',
    tmdb_id: 120,
  },
  {
    title: 'Interstellar',
    year: 2014,
    genre: ['Adventure', 'Drama', 'Sci-Fi'],
    director: ['Christopher Nolan'],
    plot: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanitys survival.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
    rating: 8.6,
    runtime: 169,
    imdb_id: 'tt0816692',
    tmdb_id: 157336,
  },
  {
    title: 'Parasite',
    year: 2019,
    genre: ['Comedy', 'Drama', 'Thriller'],
    director: ['Bong Joon Ho'],
    plot: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_SX300.jpg',
    rating: 8.6,
    runtime: 132,
    imdb_id: 'tt6751668',
    tmdb_id: 496243,
  },
  {
    title: 'Spirited Away',
    year: 2001,
    genre: ['Animation', 'Adventure', 'Family'],
    director: ['Hayao Miyazaki'],
    plot: 'During her familys move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMjlmZmI5MDctNDE2YS00YWE0LWE5ZWItZDBhYWQ0NTcxNWRhXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
    rating: 9.2,
    runtime: 125,
    imdb_id: 'tt0245429',
    tmdb_id: 129,
  },
  {
    title: 'The Green Mile',
    year: 1999,
    genre: ['Crime', 'Drama', 'Fantasy'],
    director: ['Frank Darabont'],
    plot: 'The lives of guards on Death Row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMTUxMzQyNjA5MF5BMl5BanBnXkFtZTYwOTU2NTY3._V1_SX300.jpg',
    rating: 8.6,
    runtime: 189,
    imdb_id: 'tt0120689',
    tmdb_id: 497,
  },
  {
    title: 'The Departed',
    year: 2006,
    genre: ['Crime', 'Drama', 'Thriller'],
    director: ['Martin Scorsese'],
    plot: 'An undercover cop and a police informant play a cat and mouse game with each other as they attempt to find out each others identity.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMTI1MTY2OTIxNV5BMl5BanBnXkFtZTYwNjQ4NjY3._V1_SX300.jpg',
    rating: 8.5,
    runtime: 151,
    imdb_id: 'tt0407887',
    tmdb_id: 1422,
  },
  {
    title: 'Whiplash',
    year: 2014,
    genre: ['Drama', 'Music'],
    director: ['Damien Chazelle'],
    plot: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a students potential.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BOTA5NDZlZGUtMjAxOS00YTRkLTkwYmMtYWQ0NWEwZDZiNjEzXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
    rating: 8.5,
    runtime: 106,
    imdb_id: 'tt2582802',
    tmdb_id: 244786,
  },
  {
    title: 'The Prestige',
    year: 2006,
    genre: ['Drama', 'Mystery', 'Sci-Fi'],
    director: ['Christopher Nolan'],
    plot: 'After a tragic accident, two stage magicians engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMjA4NDI0MTIxNF5BMl5BanBnXkFtZTYwNTM0MzY2._V1_SX300.jpg',
    rating: 8.5,
    runtime: 130,
    imdb_id: 'tt0482571',
    tmdb_id: 1124,
  },
  {
    title: 'The Lion King',
    year: 1994,
    genre: ['Animation', 'Adventure', 'Drama'],
    director: ['Roger Allers', 'Rob Minkoff'],
    plot: 'Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BYTYxNGMyZTYtMjE3MS00MzNjLWFjNjYtMmQ5MTRhZWM2YjE3XkEyXkFqcGdeQXVyNjY5NDU4NzI@._V1_SX300.jpg',
    rating: 8.5,
    runtime: 88,
    imdb_id: 'tt0110357',
    tmdb_id: 8587,
  },
  {
    title: 'Gladiator',
    year: 2000,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Ridley Scott'],
    plot: 'A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BMDliMmNhNDEtODUyOS00MjNlLTgxODEtN2U3NzIxMGVkZTA1L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    rating: 8.5,
    runtime: 155,
    imdb_id: 'tt0172495',
    tmdb_id: 98,
  },
  {
    title: 'Saving Private Ryan',
    year: 1998,
    genre: ['Drama', 'War'],
    director: ['Steven Spielberg'],
    plot: 'Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.',
    poster_url:
      'https://m.media-amazon.com/images/M/MV5BZjhkMDM4MWItZTVjOC00ZDRhLThmYTAtM2I5NzBmNmNlMzI1XkEyXkFqcGdeQXVyNDYyMDk5MTU@._V1_SX300.jpg',
    rating: 8.6,
    runtime: 169,
    imdb_id: 'tt0120815',
    tmdb_id: 857,
  },
]

async function addMovies() {
  console.log('🎬 Adding more movies to the database...')

  try {
    const { data, error } = await supabase.from('movies').insert(movies).select()

    if (error) {
      console.error('❌ Error adding movies:', error)
      return
    }

    console.log(`✅ Successfully added ${data.length} movies!`)
    console.log('🎉 Movies added:')
    data.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.year})`)
    })

    // Check total count
    const { count } = await supabase.from('movies').select('*', { count: 'exact', head: true })

    console.log(`\n📊 Total movies in database: ${count}`)
    console.log('🚀 Now you can test infinite scroll with more content!')
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

addMovies()
