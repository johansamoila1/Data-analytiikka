import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Movie } from '../../models/movie.model';
import { BasicMovie } from '../../models/basic-movie.model';
import { Chart, TooltipItem, ChartDataset } from 'chart.js/auto';

interface YearTrendData {
  year: number;
  indieBudget: number;
  midBudget: number;
  blockbusterBudget: number;
  avgRating: number | null;
  ratingCount: number;
  count: number;
  indieCount: number;
  midCount: number;
  blockbusterCount: number;
}

type BudgetViewMode = 'all' | 'indie' | 'mid' | 'blockbuster';

@Component({
  selector: 'app-year-trends',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatSelectModule, MatFormFieldModule, FormsModule],
  templateUrl: './year-trends.html',
  styleUrls: ['./year-trends.css'],
})
export class YearTrends implements OnInit, OnChanges {
  @Input() filteredMovies: Movie[] = [];
  @Input() extendedMovies: BasicMovie[] = [];

  @Input() set minYear(val: number) {
    this._minYear = val;
    if (this.trendChart) this.updateYearTrends();
  }
  get minYear(): number {
    return this._minYear;
  }
  private _minYear: number = 2000;

  @Input() set maxYear(val: number) {
    this._maxYear = val;
    if (this.trendChart) this.updateYearTrends();
  }
  get maxYear(): number {
    return this._maxYear;
  }
  private _maxYear: number = 2020;

  @Input() set selectedGenres(val: string[]) {
    this._selectedGenres = val;
    if (this.trendChart) this.updateYearTrends();
  }
  get selectedGenres(): string[] {
    return this._selectedGenres;
  }
  private _selectedGenres: string[] = [];

  @ViewChild('trendChart', { static: true }) trendChartRef!: ElementRef<HTMLCanvasElement>;
  trendChart: Chart<'line'> | null = null;

  private cdr: ChangeDetectorRef;

  constructor(cdr: ChangeDetectorRef) {
    this.cdr = cdr;
  }

  yearTrends = signal<YearTrendData[]>([]);
  movieCountInfo = signal<{
    rated: number;
    extended: number;
    ratedYearRange: string;
    extendedYearRange: string;
  }>({ rated: 0, extended: 0, ratedYearRange: '', extendedYearRange: '' });

  budgetViewMode: BudgetViewMode = 'all';

  budgetViewOptions = [
    { value: 'all', label: 'Kaikki yhdessä' },
    { value: 'indie', label: 'Vain Indie (<$5M)' },
    { value: 'mid', label: 'Vain Mid-budget ($5-50M)' },
    { value: 'blockbuster', label: 'Vain Blockbuster (>$50M)' },
  ];

  private budgetCategories = [
    { label: 'Indie (<$5M)', min: 0, max: 5000000 },
    { label: 'Mid-budget ($5-50M)', min: 5000000, max: 50000000 },
    { label: 'Blockbuster (>$50M)', min: 50000000, max: Infinity },
  ];

  ngOnInit() {
    this.initTrendChart();
    this.updateYearTrends();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.trendChart) return;

    const relevantChange = changes['filteredMovies'] || changes['extendedMovies'];

    if (relevantChange) {
      this.updateYearTrends();
    }
  }

  onBudgetViewModeChange() {
    this.updateChartDatasets();
  }

  private isValidRating(val: string | number | null | undefined): boolean {
    if (val === null || val === undefined || val === '') return false;
    return !isNaN(Number(val));
  }

  initTrendChart() {
    const ctx = this.trendChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#333', font: { size: 12 } } },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            callbacks: {
              label: (ctx: TooltipItem<'line'>) => {
                const trend = this.yearTrends()[ctx.dataIndex];
                if (!trend) return '';

                const datasetLabel = ctx.dataset.label || '';

                if (datasetLabel === 'Keskiarvosana') {
                  return trend.avgRating !== null
                    ? `Arvosana: ${trend.avgRating.toFixed(1)} (${trend.ratingCount} elokuvaa)`
                    : '';
                }

                if (datasetLabel === this.budgetCategories[0].label)
                  return `Indie: $${(trend.indieBudget / 1000000).toFixed(1)}M (${trend.indieCount} elokuvaa)`;
                if (datasetLabel === this.budgetCategories[1].label)
                  return `Mid-budget: $${(trend.midBudget / 1000000).toFixed(1)}M (${trend.midCount} elokuvaa)`;
                if (datasetLabel === this.budgetCategories[2].label)
                  return `Blockbuster: $${(trend.blockbusterBudget / 1000000).toFixed(1)}M (${trend.blockbusterCount} elokuvaa)`;

                return '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 } },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Arvosana', color: '#333', font: { size: 13 } },
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 } },
            min: 0,
            max: 100,
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Mediaanibudjetti ($M)',
              color: '#333',
              font: { size: 13 },
            },
            grid: { drawOnChartArea: false },
            ticks: { color: '#666', font: { size: 11 } },
          },
        },
      },
    });
  }

  updateYearTrends() {
    const hasRatings = this.filteredMovies && this.filteredMovies.length > 0;
    const hasExtended = this.extendedMovies && this.extendedMovies.length > 0;
    const hasGenres = this.selectedGenres && this.selectedGenres.length > 0;

    const validMovies = this.filteredMovies.filter(
      (m: Movie) => m.budget !== null && Number(m.budget) > 0,
    );

    let validExtendedMovies = this.extendedMovies.filter(
      (m: BasicMovie) => m.budget !== null && Number(m.budget) > 0,
    );

    if (hasGenres) {
      validExtendedMovies = validExtendedMovies.filter((m: BasicMovie) => {
        const movieGenres = m.genres ? m.genres.split(',').map((g: string) => g.trim()) : [];
        return this.selectedGenres.some((g: string) => movieGenres.includes(g));
      });
    }

    const allYears = new Set<number>();
    const ratedYears: number[] = [];

    validMovies.forEach((m: Movie) => {
      const year = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
      if (year && year >= this.minYear && year <= this.maxYear) {
        allYears.add(year);
        ratedYears.push(year);
      }
    });

    validExtendedMovies.forEach((m: BasicMovie) => {
      const year = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
      if (year && year >= this.minYear && year <= this.maxYear) {
        allYears.add(year);
      }
    });

    const years = [...allYears].sort((a, b) => a - b);

    if (years.length === 0) {
      this.yearTrends.set([]);
      this.updateChartDatasets();
      return;
    }

    const trends = years.map((year) => {
      const ratedYearMovies = validMovies.filter((m: Movie) => {
        const y = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
        return y === year;
      });

      const extendedYearMovies = hasExtended
        ? validExtendedMovies.filter((m: BasicMovie) => {
            const y = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
            return y === year;
          })
        : [];

      const getMedianByCategory = (category: { min: number; max: number }) => {
        const budgets = extendedYearMovies
          .map((m: BasicMovie) => Number(m.budget) || 0)
          .filter((b: number) => b >= category.min && b < category.max)
          .sort((a: number, b: number) => a - b);
        return budgets.length > 0 ? this.percentile(budgets, 50) : 0;
      };

      const getCountByCategory = (category: { min: number; max: number }) => {
        return extendedYearMovies.filter((m: BasicMovie) => {
          const b = Number(m.budget) || 0;
          return b >= category.min && b < category.max;
        }).length;
      };

      const indieMedian = getMedianByCategory(this.budgetCategories[0]);
      const midMedian = getMedianByCategory(this.budgetCategories[1]);
      const blockbusterMedian = getMedianByCategory(this.budgetCategories[2]);

      const indieCount = getCountByCategory(this.budgetCategories[0]);
      const midCount = getCountByCategory(this.budgetCategories[1]);
      const blockbusterCount = getCountByCategory(this.budgetCategories[2]);

      let avgRating: number | null = null;
      let ratingCount = 0;

      if (hasRatings && ratedYearMovies.length > 0) {
        const ratings = ratedYearMovies
          .map((m: Movie) => {
            const r = [
              m.vote_average_100,
              m.audience_rating,
              m.tomatometer_rating,
              m.letterbox_rating,
              m.metascore,
            ]
              .filter((v) => this.isValidRating(v))
              .map(Number);

            return r.length > 0 ? r.reduce((a: number, b: number) => a + b, 0) / r.length : null;
          })
          .filter((r): r is number => r !== null);

        if (ratings.length > 0) {
          avgRating = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
          ratingCount = ratings.length;
        }
      }

      return {
        year,
        indieBudget: indieMedian,
        midBudget: midMedian,
        blockbusterBudget: blockbusterMedian,
        avgRating,
        ratingCount,
        count: ratedYearMovies.length + extendedYearMovies.length,
        indieCount,
        midCount,
        blockbusterCount,
      };
    });

    const ratedYearSet = [...new Set(ratedYears)].sort((a, b) => a - b);
    const ratedYearRange =
      ratedYearSet.length > 0
        ? `${ratedYearSet[0]} - ${ratedYearSet[ratedYearSet.length - 1]}`
        : '';

    const extendedYearSet = [
      ...new Set([
        ...validExtendedMovies
          .map((m: BasicMovie) => {
            const y = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
            return y;
          })
          .filter((y: number) => y >= this.minYear && y <= this.maxYear),
      ]),
    ].sort((a, b) => a - b);
    const extendedYearRange =
      extendedYearSet.length > 0
        ? `${extendedYearSet[0]} - ${extendedYearSet[extendedYearSet.length - 1]}`
        : '';

    const filteredExtendedCount = validExtendedMovies.filter((m: BasicMovie) => {
      const y = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
      return y >= this.minYear && y <= this.maxYear;
    }).length;

    this.yearTrends.set(trends);
    this.movieCountInfo.set({
      rated: validMovies.length,
      extended: filteredExtendedCount,
      ratedYearRange,
      extendedYearRange,
    });
    this.cdr.detectChanges();

    this.updateChartDatasets();
  }

  private updateChartDatasets() {
    if (!this.trendChart) return;

    const trends = this.yearTrends();
    if (trends.length === 0) return;

    const hasRatings = trends.some(
      (t: YearTrendData) => t.avgRating !== null && t.avgRating !== undefined,
    );

    this.trendChart.data.labels = trends.map((t: YearTrendData) => t.year);

    const indieDataset: ChartDataset<'line'> = {
      label: this.budgetCategories[0].label,
      data: trends.map((t: YearTrendData) => t.indieBudget / 1000000),
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: hasRatings ? 'y1' : 'y',
    };

    const midDataset: ChartDataset<'line'> = {
      label: this.budgetCategories[1].label,
      data: trends.map((t: YearTrendData) => t.midBudget / 1000000),
      borderColor: 'rgba(234, 179, 8, 1)',
      backgroundColor: 'rgba(234, 179, 8, 0.8)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: hasRatings ? 'y1' : 'y',
    };

    const blockbusterDataset: ChartDataset<'line'> = {
      label: this.budgetCategories[2].label,
      data: trends.map((t: YearTrendData) => t.blockbusterBudget / 1000000),
      borderColor: 'rgba(220, 38, 38, 1)',
      backgroundColor: 'rgba(220, 38, 38, 0.8)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: hasRatings ? 'y1' : 'y',
    };

    const datasets: ChartDataset<'line'>[] = [];

    if (hasRatings) {
      datasets.push({
        label: 'Keskiarvosana',
        data: trends.map((t: YearTrendData) => (t.avgRating !== null ? t.avgRating : null)),
        borderColor: 'rgba(37, 99, 235, 1)',
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y',
        spanGaps: true,
      });
    }

    switch (this.budgetViewMode) {
      case 'all':
        datasets.push(indieDataset, midDataset, blockbusterDataset);
        break;
      case 'indie':
        datasets.push(indieDataset);
        break;
      case 'mid':
        datasets.push(midDataset);
        break;
      case 'blockbuster':
        datasets.push(blockbusterDataset);
        break;
    }

    this.trendChart.data.datasets = datasets;
    this.trendChart.update();
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return arr[lower];
    return arr[lower] + (arr[upper] - arr[lower]) * (index - lower);
  }
}
