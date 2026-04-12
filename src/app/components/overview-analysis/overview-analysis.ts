import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Movie } from '../../models/movie.model';
import { BasicMovie } from '../../models/basic-movie.model';
import Chart from 'chart.js/auto';
import { getCorrelationColor, getCorrelationTextColor } from '../../utils/movie-utils';

type RatingKey =
  | 'vote_average_100'
  | 'tomatometer_rating'
  | 'audience_rating'
  | 'letterbox_rating'
  | 'metascore';

interface RatingSource {
  key: RatingKey;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-overview-analysis',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './overview-analysis.html',
  styleUrls: ['./overview-analysis.css'],
})
export class OverviewAnalysis implements OnInit, OnChanges {
  @Input() filteredMovies: Movie[] = [];
  @Input() extendedMovies: BasicMovie[] = [];
  @Input() selectedMovie: Movie | null = null;
  @Input() selectedMovies: Movie[] = [];
  @Input() datasetMaxBudget = 0;
  @Input() selectedGenres: string[] = [];

  @Output() movieSelected = new EventEmitter<Movie>();

  @ViewChild('scatterChart', { static: true }) scatterChartRef!: ElementRef;
  scatterChart: any;

  private screenWidth = window.innerWidth;

  @HostListener('window:resize')
  onResize() {
    this.screenWidth = window.innerWidth;
    this.updatePointSizes();
  }

  private getPointSizes() {
    if (this.screenWidth < 640) {
      return { small: 2, medium: 3, large: 5, hoverSmall: 4, hoverMedium: 5, hoverLarge: 7 };
    } else if (this.screenWidth < 1024) {
      return { small: 3, medium: 5, large: 7, hoverSmall: 5, hoverMedium: 7, hoverLarge: 10 };
    }
    return { small: 5, medium: 8, large: 12, hoverSmall: 7, hoverMedium: 10, hoverLarge: 14 };
  }

  private updatePointSizes() {
    if (!this.scatterChart) return;
    const sizes = this.getPointSizes();
    this.scatterChart.data.datasets.forEach((ds: any, index: number) => {
      if (index === 0) {
        ds.pointRadius = sizes.large;
        ds.pointHoverRadius = sizes.hoverLarge;
      } else if (index === 1) {
        ds.pointRadius = sizes.medium;
        ds.pointHoverRadius = sizes.hoverMedium;
      } else {
        ds.pointRadius = sizes.small;
        ds.pointHoverRadius = sizes.hoverSmall;
      }
    });
    this.scatterChart.update();
  }

  ratingSources: RatingSource[] = [
    { key: 'vote_average_100', label: 'IMDb', shortLabel: 'IMDb' },
    { key: 'tomatometer_rating', label: 'RT Kriitikot', shortLabel: 'RT Kr.' },
    { key: 'audience_rating', label: 'RT Yleisö', shortLabel: 'RT Yl.' },
    { key: 'letterbox_rating', label: 'Letterboxd', shortLabel: 'LB' },
    { key: 'metascore', label: 'Metacritic', shortLabel: 'MC' },
  ];

  correlationMatrix = signal<number[][]>([]);
  correlationMovieCount = signal<number>(0);

  getCorrelationColor = getCorrelationColor;
  getCorrelationTextColor = getCorrelationTextColor;

  ngOnInit() {
    this.initScatterChart();
    this.updateAll();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      this.scatterChart &&
      (changes['filteredMovies'] ||
        changes['selectedMovie'] ||
        changes['selectedGenres'] ||
        changes['extendedMovies'] ||
        changes['selectedMovies'])
    ) {
      this.updateAll();
    }
  }

  updateAll() {
    this.calculateCorrelationMatrix();
    this.updateScatterChart();
  }

  private getMovieRating(movie: Movie, key: RatingKey): number {
    const value = movie[key];
    return typeof value === 'number' ? value : Number(value) || 0;
  }

  private pearsonCorrelation(movies: Movie[], key1: RatingKey, key2: RatingKey): number {
    if (movies.length < 2) return 0;
    const values1 = movies.map((m) => this.getMovieRating(m, key1));
    const values2 = movies.map((m) => this.getMovieRating(m, key2));

    const n = values1.length;
    const sum1 = values1.reduce((a, b) => a + b, 0);
    const sum2 = values2.reduce((a, b) => a + b, 0);
    const sum1Sq = values1.reduce((a, b) => a + b * b, 0);
    const sum2Sq = values2.reduce((a, b) => a + b * b, 0);
    const pSum = values1.reduce((a, b, i) => a + b * values2[i], 0);

    const num = pSum - (sum1 * sum2) / n;
    const den = Math.sqrt(Math.max(0, (sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n)));
    return den === 0 ? 0 : num / den;
  }

  calculateCorrelationMatrix() {
    const sources: RatingSource[] = this.ratingSources;
    const matrix: number[][] = [];
    let totalValid = 0;

    for (let i = 0; i < sources.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < sources.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const validMovies = this.filteredMovies.filter((m) => {
            const val1 = this.getMovieRating(m, sources[i].key);
            const val2 = this.getMovieRating(m, sources[j].key);
            return !isNaN(val1) && !isNaN(val2);
          });
          matrix[i][j] = this.pearsonCorrelation(validMovies, sources[i].key, sources[j].key);
          if (i < j) totalValid += validMovies.length;
        }
      }
    }

    const avgValid = Math.round(totalValid / ((sources.length * (sources.length - 1)) / 2)) || 0;
    this.correlationMovieCount.set(avgValid);
    this.correlationMatrix.set(matrix);
  }

  initScatterChart() {
    const ctx = this.scatterChartRef.nativeElement.getContext('2d');
    this.scatterChart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#333', font: { size: 12 } } },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            callbacks: {
              label: (ctx: any) => {
                const point = ctx.raw;
                if (!point) return '';
                const title = point.title || 'Tuntematon';
                const year = point.year ? ` (${point.year})` : '';
                return `${title}${year}: $${point.x.toFixed(1)}M → $${point.y.toFixed(1)}M`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'logarithmic',
            position: 'bottom',
            title: { display: true, text: 'Budjetti ($M)', color: '#333', font: { size: 13 } },
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 } },
            min: 0.1,
          },
          y: {
            type: 'logarithmic',
            title: { display: true, text: 'Tuotto ($M)', color: '#333', font: { size: 13 } },
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 } },
            min: 0.1,
          },
        },
      },
    });
  }

  updateScatterChart() {
    if (!this.scatterChart) return;

    const movies = this.filteredMovies.filter((m) => Number(m.budget) > 0 && Number(m.revenue) > 0);
    const selectedMovieData =
      this.selectedMovie &&
      Number(this.selectedMovie.budget) > 0 &&
      Number(this.selectedMovie.revenue) > 0
        ? [
            {
              x: this.selectedMovie.budget,
              y: this.selectedMovie.revenue,
              movie: this.selectedMovie,
            },
          ]
        : [];
    const selectedMoviesData = this.selectedMovies
      ? this.selectedMovies
          .filter((m) => Number(m.budget) > 0 && Number(m.revenue) > 0)
          .map((m) => ({ x: m.budget, y: m.revenue, movie: m }))
      : [];

    const datasets: any[] = [];

    if (selectedMovieData.length > 0) {
      datasets.push({
        label: 'Valittu elokuva',
        data: selectedMovieData.map((d) => ({
          x: Number(d.x) / 1000000,
          y: Number(d.y) / 1000000,
          title: d.movie?.title || '',
          year: d.movie?.year || '',
        })),
        backgroundColor: 'rgba(220, 38, 38, 1)',
        borderColor: 'rgba(220, 38, 38, 1)',
        pointRadius: this.getPointSizes().large,
        pointHoverRadius: this.getPointSizes().hoverLarge,
      });
    }

    if (selectedMoviesData.length > 0) {
      datasets.push({
        label: 'Valitut elokuvat',
        data: selectedMoviesData.map((d) => ({
          x: Number(d.x) / 1000000,
          y: Number(d.y) / 1000000,
          title: d.movie?.title || '',
          year: d.movie?.year || '',
        })),
        backgroundColor: 'rgba(234, 179, 8, 1)',
        borderColor: 'rgba(234, 179, 8, 1)',
        pointRadius: this.getPointSizes().medium,
        pointHoverRadius: this.getPointSizes().hoverMedium,
      });
    }

    if (movies.length > 0) {
      datasets.push({
        label: 'Kaikki elokuvat',
        data: movies.map((m) => ({
          x: Number(m.budget) / 1000000,
          y: Number(m.revenue) / 1000000,
          title: m.title || '',
          year: m.year || '',
        })),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointRadius: this.getPointSizes().small,
        pointHoverRadius: this.getPointSizes().hoverSmall,
      });
    }

    const breakEvenData: { x: number; y: number }[] = [];
    for (let x = 0.1; x <= 300; x *= 1.5) {
      breakEvenData.push({ x, y: 2.5 * x });
    }

    datasets.push({
      label: 'Break-even (2.5x)',
      data: breakEvenData,
      type: 'line',
      borderColor: 'rgba(220, 38, 38, 1)',
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      borderWidth: 4,
      borderDash: [8, 4],
      pointRadius: 0,
      fill: false,
      spanGaps: true,
      order: -1,
    });

    this.scatterChart.data.datasets = datasets;
    this.scatterChart.update();
  }
}
