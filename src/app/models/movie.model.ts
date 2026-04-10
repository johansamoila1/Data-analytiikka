export interface Movie {
  title: string | number;
  title_clean: string | null;
  year: number | string | null;
  budget: number | string | null;
  revenue: number | string | null;
  vote_count: number | string | null;
  vote_average_100: number | string | null;
  tomatometer_rating: number | string | null;
  audience_rating: number | string | null;
  letterbox_rating: number | string | null;
  metascore: number | string | null;
  rating_count?: number | string | null;
  roi: number | string | null;
  genres: string | null;
}
