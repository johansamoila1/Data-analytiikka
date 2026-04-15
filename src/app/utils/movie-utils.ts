import { Movie } from '../models/movie.model';

function parseRating(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return !isNaN(num) ? num : null;
}

export function getWeightedScore(m: Movie): {
  combinedScore: number | null;
  combinedAudienceScore: number | null;
} {
  const voteAvg = parseRating(m.vote_average_100);
  const audRating = parseRating(m.audience_rating);

  let a: number | null = null;
  if (voteAvg !== null && audRating !== null) {
    a = (voteAvg + audRating) / 2;
  } else if (voteAvg !== null) {
    a = voteAvg;
  } else if (audRating !== null) {
    a = audRating;
  }

  const c = parseRating(m.tomatometer_rating);
  const l = parseRating(m.letterbox_rating);
  const mc = parseRating(m.metascore);

  let eScore = 0;
  let weightSum = 0;

  if (c !== null) {
    eScore += c * 0.3;
    weightSum += 0.3;
  }
  if (a !== null) {
    eScore += a * 0.25;
    weightSum += 0.25;
  }
  if (l !== null) {
    eScore += l * 0.25;
    weightSum += 0.25;
  }
  if (mc !== null) {
    eScore += mc * 0.2;
    weightSum += 0.2;
  }

  return {
    combinedScore: weightSum > 0 ? eScore / weightSum : null,
    combinedAudienceScore: a !== null ? Math.round(a) : null,
  };
}

export function getCorrelationColor(value: number): string {
  const absVal = Math.abs(value);
  if (absVal < 0.3) return 'rgba(150, 150, 170, 0.3)';
  if (value >= 0) {
    if (absVal < 0.5) return 'rgba(59, 130, 246, 0.5)';
    if (absVal < 0.7) return 'rgba(59, 130, 246, 0.7)';
    return 'rgba(59, 130, 246, 0.9)';
  } else {
    if (absVal < 0.5) return 'rgba(239, 68, 68, 0.5)';
    if (absVal < 0.7) return 'rgba(239, 68, 68, 0.7)';
    return 'rgba(239, 68, 68, 0.9)';
  }
}

export function getCorrelationTextColor(value: number): string {
  return Math.abs(value) > 0.4 ? '#fff' : '#333';
}
