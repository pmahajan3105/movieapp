const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const additionalMovies = [
  {
    title: 'Pulp Fiction',
    year: 1994,
    genre: ['Crime', 'Drama'],
    director: ['Quentin Tarantino'],
    plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
    poster_url: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    rating: 8.9,
    runtime: 154,
    omdb_id: 'tt0110912',
  },
  {
    title: 'The Dark Knight',
    year: 2008,
    genre: ['Action', 'Crime', 'Drama'],
    director: ['Christopher Nolan'],
    plot: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    poster_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    rating: 9.0,
    runtime: 152,
    omdb_id: 'tt0468569',
  },
  {
    title: 'Forrest Gump',
    year: 1994,
    genre: ['Drama', 'Romance'],
    director: ['Robert Zemeckis'],
    plot: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man.',
    poster_url: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    rating: 8.8,
    runtime: 142,
    omdb_id: 'tt0109830',
  },
  {
    title: 'Inception',
    year: 2010,
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    director: ['Christopher Nolan'],
    plot: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    poster_url: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    rating: 8.8,
    runtime: 148,
    omdb_id: 'tt1375666',
  },
  {
    title: 'The Matrix',
    year: 1999,
    genre: ['Action', 'Sci-Fi'],
    director: ['Lana Wachowski', 'Lilly Wachowski'],
    plot: 'A computer programmer is led to fight an underground war against powerful computers who have constructed his entire reality with a system called the Matrix.',
    poster_url: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    rating: 8.7,
    runtime: 136,
    omdb_id: 'tt0133093',
  },
  {
    title: 'Goodfellas',
    year: 1990,
    genre: ['Biography', 'Crime', 'Drama'],
    director: ['Martin Scorsese'],
    plot: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.',
    poster_url: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
    rating: 8.7,
    runtime: 146,
    omdb_id: 'tt0099685',
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    year: 2003,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Peter Jackson'],
    plot: "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.",
    poster_url: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
    rating: 8.9,
    runtime: 201,
    omdb_id: 'tt0167260',
  },
  {
    title: 'Fight Club',
    year: 1999,
    genre: ['Drama'],
    director: ['David Fincher'],
    plot: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into an anarchist organization.',
    poster_url: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    rating: 8.8,
    runtime: 139,
    omdb_id: 'tt0137523',
  },
  {
    title: 'Star Wars: Episode V - The Empire Strikes Back',
    year: 1980,
    genre: ['Action', 'Adventure', 'Fantasy'],
    director: ['Irvin Kershner'],
    plot: 'After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda.',
    poster_url: 'https://image.tmdb.org/t/p/w500/2l05cFWJacyIsTpsqSgH0wQXe4V.jpg',
    rating: 8.7,
    runtime: 124,
    omdb_id: 'tt0080684',
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    year: 2001,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Peter Jackson'],
    plot: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth from the Dark Lord Sauron.',
    poster_url: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
    rating: 8.8,
    runtime: 178,
    omdb_id: 'tt0120737',
  },
  {
    title: 'Interstellar',
    year: 2014,
    genre: ['Adventure', 'Drama', 'Sci-Fi'],
    director: ['Christopher Nolan'],
    plot: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    rating: 8.6,
    runtime: 169,
    omdb_id: 'tt0816692',
  },
  {
    title: 'Parasite',
    year: 2019,
    genre: ['Comedy', 'Drama', 'Thriller'],
    director: ['Bong Joon Ho'],
    plot: 'A poor family schemes to become employed by a wealthy family and infiltrate their household by posing as unrelated, highly qualified individuals.',
    poster_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    rating: 8.6,
    runtime: 132,
    omdb_id: 'tt6751668',
  },
  {
    title: 'Spirited Away',
    year: 2001,
    genre: ['Animation', 'Adventure', 'Family'],
    director: ['Hayao Miyazaki'],
    plot: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.",
    poster_url: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    rating: 9.2,
    runtime: 125,
    omdb_id: 'tt0245429',
  },
  {
    title: 'The Green Mile',
    year: 1999,
    genre: ['Crime', 'Drama', 'Fantasy'],
    director: ['Frank Darabont'],
    plot: 'The lives of guards on Death Row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.',
    poster_url: 'https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
    rating: 8.6,
    runtime: 189,
    omdb_id: 'tt0120689',
  },
  {
    title: 'The Departed',
    year: 2006,
    genre: ['Crime', 'Drama', 'Thriller'],
    director: ['Martin Scorsese'],
    plot: "An undercover cop and a police informant play a cat and mouse game with each other as they attempt to find out each other's identity.",
    poster_url: 'https://image.tmdb.org/t/p/w500/nT97ifVT2J1yMQmeq20Qblg61T.jpg',
    rating: 8.5,
    runtime: 151,
    omdb_id: 'tt0407887',
  },
  {
    title: 'Whiplash',
    year: 2014,
    genre: ['Drama', 'Music'],
    director: ['Damien Chazelle'],
    plot: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.",
    poster_url: 'https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg',
    rating: 8.5,
    runtime: 106,
    omdb_id: 'tt2582802',
  },
  {
    title: 'The Prestige',
    year: 2006,
    genre: ['Drama', 'Mystery', 'Sci-Fi'],
    director: ['Christopher Nolan'],
    plot: 'After a tragic accident, two stage magicians engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.',
    poster_url: 'https://image.tmdb.org/t/p/w500/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg',
    rating: 8.5,
    runtime: 130,
    omdb_id: 'tt0482571',
  },
  {
    title: 'The Lion King',
    year: 1994,
    genre: ['Animation', 'Adventure', 'Drama'],
    director: ['Roger Allers', 'Rob Minkoff'],
    plot: "A Lion cub crown prince is tricked by a treacherous uncle into thinking he caused his father's death and flees into exile in despair, only to learn in adulthood his identity and his responsibilities.",
    poster_url: 'https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
    rating: 8.5,
    runtime: 88,
    omdb_id: 'tt0110357',
  },
  {
    title: 'Gladiator',
    year: 2000,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Ridley Scott'],
    plot: 'A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.',
    poster_url: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
    rating: 8.5,
    runtime: 155,
    omdb_id: 'tt0172495',
  },
  {
    title: 'Saving Private Ryan',
    year: 1998,
    genre: ['Drama', 'War'],
    director: ['Steven Spielberg'],
    plot: 'Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.',
    poster_url: 'https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg',
    rating: 8.6,
    runtime: 169,
    omdb_id: 'tt0120815',
  },
]

async function addMovies() {
  console.log('🎬 Adding more movies to the database...')

  try {
    const { data, error } = await supabase.from('movies').insert(additionalMovies).select()

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
