const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const popularMovies = [
  {
    title: 'The Shawshank Redemption',
    year: 1994,
    genre: ['Drama'],
    director: ['Frank Darabont'],
    plot: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    rating: 9.3,
    poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
  },
  {
    title: 'The Godfather',
    year: 1972,
    genre: ['Crime', 'Drama'],
    director: ['Francis Ford Coppola'],
    plot: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    rating: 9.2,
    poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  },
  {
    title: 'The Dark Knight',
    year: 2008,
    genre: ['Action', 'Crime', 'Drama'],
    director: ['Christopher Nolan'],
    plot: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    rating: 9.0,
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  },
  {
    title: 'Pulp Fiction',
    year: 1994,
    genre: ['Crime', 'Drama'],
    director: ['Quentin Tarantino'],
    plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
    rating: 8.9,
    poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
  },
  {
    title: 'Forrest Gump',
    year: 1994,
    genre: ['Drama', 'Romance'],
    director: ['Robert Zemeckis'],
    plot: 'The presidencies of Kennedy and Johnson, the Vietnam War, and other historical events unfold from the perspective of an Alabama man.',
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
  },
  {
    title: 'Inception',
    year: 2010,
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    director: ['Christopher Nolan'],
    plot: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  },
  {
    title: 'The Matrix',
    year: 1999,
    genre: ['Action', 'Sci-Fi'],
    director: ['Lana Wachowski', 'Lilly Wachowski'],
    plot: 'A computer programmer discovers that reality as he knows it is a simulation and joins a rebellion to free humanity.',
    rating: 8.7,
    poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
  },
  {
    title: 'Goodfellas',
    year: 1990,
    genre: ['Biography', 'Crime', 'Drama'],
    director: ['Martin Scorsese'],
    plot: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.',
    rating: 8.7,
    poster: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    year: 2003,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Peter Jackson'],
    plot: "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom.",
    rating: 8.9,
    poster: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
  },
  {
    title: 'Fight Club',
    year: 1999,
    genre: ['Drama'],
    director: ['David Fincher'],
    plot: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  },
  {
    title: 'Star Wars: Episode V - The Empire Strikes Back',
    year: 1980,
    genre: ['Action', 'Adventure', 'Fantasy'],
    director: ['Irvin Kershner'],
    plot: 'After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda.',
    rating: 8.7,
    poster: 'https://image.tmdb.org/t/p/w500/2l05cFWJacyIsTpsqSgH0wQXe4V.jpg',
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    year: 2001,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Peter Jackson'],
    plot: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring.',
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
  },
  {
    title: "One Flew Over the Cuckoo's Nest",
    year: 1975,
    genre: ['Drama'],
    director: ['Milos Forman'],
    plot: 'A criminal pleads insanity and is admitted to a mental institution, where he rebels against the oppressive nurse.',
    rating: 8.7,
    poster: 'https://image.tmdb.org/t/p/w500/3jcbDmRFiQ83drXNOvRDeKHxS0C.jpg',
  },
  {
    title: 'Interstellar',
    year: 2014,
    genre: ['Adventure', 'Drama', 'Sci-Fi'],
    director: ['Christopher Nolan'],
    plot: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    rating: 8.6,
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  },
  {
    title: 'Parasite',
    year: 2019,
    genre: ['Comedy', 'Drama', 'Thriller'],
    director: ['Bong Joon Ho'],
    plot: 'A poor family schemes to become employed by a wealthy family and infiltrate their household by posing as unrelated, highly qualified individuals.',
    rating: 8.6,
    poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  },
  {
    title: 'The Departed',
    year: 2006,
    genre: ['Crime', 'Drama', 'Thriller'],
    director: ['Martin Scorsese'],
    plot: "An undercover cop and a police informant play a cat and mouse game with each other as they attempt to find out each other's identity.",
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/nT97ifVT2J1yMQmeq20Qblg61T.jpg',
  },
  {
    title: 'The Prestige',
    year: 2006,
    genre: ['Drama', 'Mystery', 'Thriller'],
    director: ['Christopher Nolan'],
    plot: 'After a tragic accident, two stage magicians engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg',
  },
  {
    title: 'Gladiator',
    year: 2000,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Ridley Scott'],
    plot: 'A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
  },
  {
    title: 'The Lion King',
    year: 1994,
    genre: ['Animation', 'Adventure', 'Drama'],
    director: ['Roger Allers', 'Rob Minkoff'],
    plot: 'Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
  },
  {
    title: 'Saving Private Ryan',
    year: 1998,
    genre: ['Drama', 'War'],
    director: ['Steven Spielberg'],
    plot: 'Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.',
    rating: 8.6,
    poster: 'https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg',
  },
  {
    title: 'Terminator 2: Judgment Day',
    year: 1991,
    genre: ['Action', 'Sci-Fi'],
    director: ['James Cameron'],
    plot: 'A cyborg, identical to the one who failed to kill Sarah Connor, must now protect her teenage son John Connor from a more advanced and powerful cyborg.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/5M0j0B18abtBI5gi2RhfjjurTqb.jpg',
  },
  {
    title: 'Back to the Future',
    year: 1985,
    genre: ['Adventure', 'Comedy', 'Sci-Fi'],
    director: ['Robert Zemeckis'],
    plot: 'Marty McFly, a 17-year-old high school student, is accidentally sent thirty years into the past in a time-traveling DeLorean.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg',
  },
  {
    title: 'Spirited Away',
    year: 2001,
    genre: ['Animation', 'Adventure', 'Family'],
    director: ['Hayao Miyazaki'],
    plot: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.",
    rating: 9.2,
    poster: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
  },
  {
    title: 'Psycho',
    year: 1960,
    genre: ['Horror', 'Mystery', 'Thriller'],
    director: ['Alfred Hitchcock'],
    plot: "A Phoenix secretary embezzles $40,000 from her employer's client and flees to a remote motel run by a young man under the domination of his mother.",
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg',
  },
  {
    title: 'Casablanca',
    year: 1942,
    genre: ['Drama', 'Romance', 'War'],
    director: ['Michael Curtiz'],
    plot: 'A cynical expatriate American cafe owner struggles to decide whether or not to help his former lover and her fugitive husband escape the Nazis in French Morocco.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg',
  },
  {
    title: 'City of God',
    year: 2002,
    genre: ['Crime', 'Drama'],
    director: ['Fernando Meirelles', 'Kátia Lund'],
    plot: "In the slums of Rio, two kids' paths diverge as one struggles to become a photographer and the other a kingpin.",
    rating: 8.6,
    poster: 'https://image.tmdb.org/t/p/w500/k7eYdcdYEZs3dcFMkwt87UGqjQV.jpg',
  },
  {
    title: 'Once Upon a Time in the West',
    year: 1968,
    genre: ['Western'],
    director: ['Sergio Leone'],
    plot: 'A mysterious stranger with a harmonica joins forces with a notorious desperado to protect a beautiful widow from a ruthless assassin.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/qbYgqOczabWNn2XKwgMtKrje7Lf.jpg',
  },
  {
    title: 'Modern Times',
    year: 1936,
    genre: ['Comedy', 'Drama', 'Family'],
    director: ['Charlie Chaplin'],
    plot: 'The Tramp struggles to live in modern industrial society with the help of a young homeless woman.',
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/3qJzNBpkBmWCYZGCGSYbXLJXNiH.jpg',
  },
  {
    title: 'Raiders of the Lost Ark',
    year: 1981,
    genre: ['Action', 'Adventure'],
    director: ['Steven Spielberg'],
    plot: "In 1936, archaeologist and adventurer Indiana Jones is hired by the U.S. government to find the Ark of the Covenant before Adolf Hitler's Nazis can obtain it.",
    rating: 8.4,
    poster: 'https://image.tmdb.org/t/p/w500/ceG9VzoRAVGwivFU403Wc3AHRys.jpg',
  },
  {
    title: 'Rear Window',
    year: 1954,
    genre: ['Mystery', 'Thriller'],
    director: ['Alfred Hitchcock'],
    plot: 'A wheelchair-bound photographer spies on his neighbors from his apartment window and becomes convinced one of them has committed murder.',
    rating: 8.4,
    poster: 'https://image.tmdb.org/t/p/w500/ILVF0eJxHMddjxeQhswFtpMtqx.jpg',
  },
]

async function addMovies() {
  console.log('🎬 Adding popular movies to database...')

  try {
    // Check current movie count
    const { count: currentCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 Current movies in database: ${currentCount}`)

    // Add movies in batches to avoid conflicts
    let addedCount = 0

    for (const movie of popularMovies) {
      // Check if movie already exists
      const { data: existing } = await supabase
        .from('movies')
        .select('id')
        .eq('title', movie.title)
        .eq('year', movie.year)
        .single()

      if (existing) {
        console.log(`⏭️  Skipping "${movie.title}" (${movie.year}) - already exists`)
        continue
      }

      // Insert the movie
      const { error } = await supabase.from('movies').insert([movie])

      if (error) {
        console.error(`❌ Error adding "${movie.title}":`, error.message)
      } else {
        console.log(`✅ Added "${movie.title}" (${movie.year})`)
        addedCount++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Final count
    const { count: finalCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })

    console.log(`\n🎉 Successfully added ${addedCount} new movies!`)
    console.log(`📊 Total movies in database: ${finalCount}`)
    console.log(`🚀 Your infinite scroll will now have ${finalCount} movies to browse!`)
  } catch (error) {
    console.error('❌ Error adding movies:', error)
  }
}

addMovies()
