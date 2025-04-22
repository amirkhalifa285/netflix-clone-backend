const axios = require('axios');
const Content = require('../models/Content');

// TMDB API configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '0931ab7e4e59dbd0ba38c6dc1fbb1148';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

// Helper function to build URLs
const createTmdbUrl = (endpoint, params = {}) => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  
  // Add any additional parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
};

// Helper function to get image URL
const getImageUrl = (path, size = 'original') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}${size}${path}`;
};

// Transform TMDB movie data to our schema
const transformMovieData = async (movie) => {
  // Get additional details, credits, and keywords
  const [detailsRes, creditsRes, keywordsRes] = await Promise.all([
    axios.get(createTmdbUrl(`/movie/${movie.id}`)),
    axios.get(createTmdbUrl(`/movie/${movie.id}/credits`)),
    axios.get(createTmdbUrl(`/movie/${movie.id}/keywords`))
  ]);
  
  const details = detailsRes.data;
  const credits = creditsRes.data;
  const keywords = keywordsRes.data;
  
  return {
    tmdbId: movie.id,
    title: movie.title,
    type: 'movie',
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    releaseDate: movie.release_date ? new Date(movie.release_date) : null,
    genres: details.genres || [],
    runtime: details.runtime,
    popularity: movie.popularity,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    cast: credits.cast.slice(0, 10).map(actor => ({
      id: actor.id,
      name: actor.name,
      character: actor.character,
      profilePath: actor.profile_path
    })),
    crew: credits.crew.filter(person => 
      ['Director', 'Producer', 'Screenplay', 'Writer'].includes(person.job)
    ).map(person => ({
      id: person.id,
      name: person.name,
      job: person.job,
      profilePath: person.profile_path
    })),
    keywords: keywords.keywords.map(keyword => ({
      id: keyword.id,
      name: keyword.name
    }))
  };
};

// Transform TMDB TV show data to our schema
const transformTvData = async (tvShow) => {
  // Get additional details, credits, and keywords
  const [detailsRes, creditsRes, keywordsRes] = await Promise.all([
    axios.get(createTmdbUrl(`/tv/${tvShow.id}`)),
    axios.get(createTmdbUrl(`/tv/${tvShow.id}/credits`)),
    axios.get(createTmdbUrl(`/tv/${tvShow.id}/keywords`))
  ]);
  
  const details = detailsRes.data;
  const credits = creditsRes.data;
  const keywords = keywordsRes.data.results || [];
  
  // Process seasons and episodes
  const seasons = [];
  if (details.seasons && details.seasons.length > 0) {
    for (const season of details.seasons.slice(0, 3)) { // Limit to first 3 seasons for performance
      const seasonRes = await axios.get(createTmdbUrl(`/tv/${tvShow.id}/season/${season.season_number}`));
      const seasonData = seasonRes.data;
      
      seasons.push({
        id: season.id,
        name: season.name,
        episodeCount: season.episode_count,
        overview: season.overview,
        posterPath: season.poster_path,
        airDate: season.air_date ? new Date(season.air_date) : null,
        episodes: seasonData.episodes.map(episode => ({
          id: episode.id,
          name: episode.name,
          overview: episode.overview,
          stillPath: episode.still_path,
          airDate: episode.air_date ? new Date(episode.air_date) : null,
          episodeNumber: episode.episode_number,
          seasonNumber: episode.season_number
        }))
      });
    }
  }
  
  return {
    tmdbId: tvShow.id,
    title: tvShow.name,
    type: 'tv',
    overview: tvShow.overview,
    posterPath: tvShow.poster_path,
    backdropPath: tvShow.backdrop_path,
    releaseDate: tvShow.first_air_date ? new Date(tvShow.first_air_date) : null,
    genres: details.genres || [],
    runtime: details.episode_run_time && details.episode_run_time.length > 0 
      ? details.episode_run_time[0] 
      : null,
    popularity: tvShow.popularity,
    voteAverage: tvShow.vote_average,
    voteCount: tvShow.vote_count,
    cast: credits.cast.slice(0, 10).map(actor => ({
      id: actor.id,
      name: actor.name,
      character: actor.character,
      profilePath: actor.profile_path
    })),
    crew: credits.crew.filter(person => 
      ['Creator', 'Executive Producer', 'Director', 'Writer'].includes(person.job)
    ).map(person => ({
      id: person.id,
      name: person.name,
      job: person.job,
      profilePath: person.profile_path
    })),
    seasons,
    keywords: keywords.map(keyword => ({
      id: keyword.id,
      name: keyword.name
    }))
  };
};

const tmdbService = {
  // Fetch trending content and store in DB
  fetchAndStoreTrending: async () => {
    try {
      // Fetch trending movies
      const trendingMoviesRes = await axios.get(createTmdbUrl('/trending/movie/week'));
      const trendingMovies = trendingMoviesRes.data.results;
      
      // Fetch trending TV shows
      const trendingTvRes = await axios.get(createTmdbUrl('/trending/tv/week'));
      const trendingTv = trendingTvRes.data.results;
      
      // Process and store movies
      for (const movie of trendingMovies) {
        try {
          // Check if movie already exists in DB
          const existingMovie = await Content.findOne({ tmdbId: movie.id, type: 'movie' });
          
          if (existingMovie) {
            // Update existing movie data
            existingMovie.popularity = movie.popularity;
            existingMovie.voteAverage = movie.vote_average;
            existingMovie.voteCount = movie.vote_count;
            existingMovie.updatedAt = new Date();
            await existingMovie.save();
          } else {
            // Transform and save new movie
            const transformedMovie = await transformMovieData(movie);
            await Content.create(transformedMovie);
          }
        } catch (error) {
          console.error(`Error processing trending movie ${movie.id}:`, error);
          // Continue with next movie
        }
      }
      
      // Process and store TV shows
      for (const tvShow of trendingTv) {
        try {
          // Check if TV show already exists in DB
          const existingTv = await Content.findOne({ tmdbId: tvShow.id, type: 'tv' });
          
          if (existingTv) {
            // Update existing TV show data
            existingTv.popularity = tvShow.popularity;
            existingTv.voteAverage = tvShow.vote_average;
            existingTv.voteCount = tvShow.vote_count;
            existingTv.updatedAt = new Date();
            await existingTv.save();
          } else {
            // Transform and save new TV show
            const transformedTv = await transformTvData(tvShow);
            await Content.create(transformedTv);
          }
        } catch (error) {
          console.error(`Error processing trending TV show ${tvShow.id}:`, error);
          // Continue with next TV show
        }
      }
      
      return {
        success: true,
        moviesCount: trendingMovies.length,
        tvCount: trendingTv.length
      };
    } catch (error) {
      console.error('Error fetching trending content:', error);
      throw new Error('Failed to fetch trending content');
    }
  },
  
  // Fetch new releases and store in DB
  fetchAndStoreNewReleases: async () => {
    try {
      // Get current date and date 30 days ago
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      // Format dates for TMDB API
      const todayStr = today.toISOString().split('T')[0];
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      // Fetch new movies
      const newMoviesRes = await axios.get(createTmdbUrl('/discover/movie', {
        'primary_release_date.gte': thirtyDaysAgoStr,
        'primary_release_date.lte': todayStr,
        'sort_by': 'popularity.desc'
      }));
      const newMovies = newMoviesRes.data.results;
      
      // Fetch new TV shows
      const newTvRes = await axios.get(createTmdbUrl('/discover/tv', {
        'first_air_date.gte': thirtyDaysAgoStr,
        'first_air_date.lte': todayStr,
        'sort_by': 'popularity.desc'
      }));
      const newTv = newTvRes.data.results;
      
      // Process and store new movies
      for (const movie of newMovies) {
        try {
          // Check if movie already exists in DB
          const existingMovie = await Content.findOne({ tmdbId: movie.id, type: 'movie' });
          
          if (!existingMovie) {
            // Transform and save new movie
            const transformedMovie = await transformMovieData(movie);
            await Content.create(transformedMovie);
          }
        } catch (error) {
          console.error(`Error processing new movie ${movie.id}:`, error);
          // Continue with next movie
        }
      }
      
      // Process and store new TV shows
      for (const tvShow of newTv) {
        try {
          // Check if TV show already exists in DB
          const existingTv = await Content.findOne({ tmdbId: tvShow.id, type: 'tv' });
          
          if (!existingTv) {
            // Transform and save new TV show
            const transformedTv = await transformTvData(tvShow);
            await Content.create(transformedTv);
          }
        } catch (error) {
          console.error(`Error processing new TV show ${tvShow.id}:`, error);
          // Continue with next TV show
        }
      }
      
      return {
        success: true,
        moviesCount: newMovies.length,
        tvCount: newTv.length
      };
    } catch (error) {
      console.error('Error fetching new releases:', error);
      throw new Error('Failed to fetch new releases');
    }
  },
  
  // Fetch content by genre and store in DB
  fetchAndStoreByGenre: async (genreId, contentType = 'movie') => {
    try {
      const endpoint = contentType === 'movie' ? '/discover/movie' : '/discover/tv';
      const response = await axios.get(createTmdbUrl(endpoint, {
        'with_genres': genreId,
        'sort_by': 'popularity.desc'
      }));
      
      const results = response.data.results;
      
      for (const item of results) {
        try {
          // Check if content already exists in DB
          const existingContent = await Content.findOne({ 
            tmdbId: item.id, 
            type: contentType 
          });
          
          if (!existingContent) {
            // Transform and save new content
            const transformedItem = contentType === 'movie' 
              ? await transformMovieData(item) 
              : await transformTvData(item);
              
            await Content.create(transformedItem);
          }
        } catch (error) {
          console.error(`Error processing ${contentType} ${item.id}:`, error);
          // Continue with next item
        }
      }
      
      return {
        success: true,
        count: results.length
      };
    } catch (error) {
      console.error(`Error fetching ${contentType} by genre:`, error);
      throw new Error(`Failed to fetch ${contentType} by genre`);
    }
  },
  
  // Fetch content details by TMDB ID
  fetchContentDetails: async (tmdbId, contentType) => {
    try {
      const endpoint = contentType === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
      const response = await axios.get(createTmdbUrl(endpoint));
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${contentType} details:`, error);
      throw new Error(`Failed to fetch ${contentType} details`);
    }
  },
  
  // Set featured content (top 4 items for banner rotation)
  setFeaturedContent: async () => {
    try {
      // Reset all featured flags
      await Content.updateMany({}, { featured: false });
      
      // Get top 2 trending movies and 2 TV shows
      const topMovies = await Content.find({ type: 'movie' })
        .sort({ popularity: -1 })
        .limit(2);
        
      const topTv = await Content.find({ type: 'tv' })
        .sort({ popularity: -1 })
        .limit(2);
      
      // Set featured flag for these items
      const featuredIds = [...topMovies, ...topTv].map(item => item._id);
      await Content.updateMany(
        { _id: { $in: featuredIds } },
        { featured: true }
      );
      
      return {
        success: true,
        featuredIds
      };
    } catch (error) {
      console.error('Error setting featured content:', error);
      throw new Error('Failed to set featured content');
    }
  }
};

module.exports = tmdbService;