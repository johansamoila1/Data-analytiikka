import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Movie } from '../../models/movie.model';
import { Chart, ChartOptions, TooltipItem } from 'chart.js/auto';

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predicted: number;
  n: number;
}

interface DataPoint {
  x: number;
  y: number;
  movieContext?: Movie;
}

@Component({
  selector: 'app-regression-analysis',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './regression-analysis.html',
  styleUrls: ['./regression-analysis.css'],
})
export class RegressionAnalysis implements OnInit, OnChanges {
  @Input() filteredMovies: Movie[] = [];

  @ViewChild('budgetRevenueChart', { static: true })
  budgetRevenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ratingMultipleChart', { static: true })
  ratingMultipleChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('budgetMultipleChart', { static: true })
  budgetMultipleChartRef!: ElementRef<HTMLCanvasElement>;

  budgetRevenueChart: Chart | null = null;
  ratingMultipleChart: Chart | null = null;
  budgetMultipleChart: Chart | null = null;

  budgetRevenueResult = signal<RegressionResult | null>(null);
  ratingMultipleResult = signal<RegressionResult | null>(null);
  budgetMultipleResult = signal<RegressionResult | null>(null);

  ngOnInit() {
    this.initCharts();
    this.updateAllRegressions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.budgetRevenueChart && changes['filteredMovies']) {
      this.updateAllRegressions();
    }
  }

  mathPow10(value: number): number {
    return Math.pow(10, value);
  }

  initCharts() {
    const ctx1 = this.budgetRevenueChartRef.nativeElement.getContext('2d');
    if (ctx1) {
      this.budgetRevenueChart = new Chart(ctx1, {
        type: 'scatter',
        data: { datasets: [] },
        options: this.getChartOptions('Budjetti ($M)', 'Tuotto ($M)', true),
      });
    }

    const ctx2 = this.ratingMultipleChartRef.nativeElement.getContext('2d');
    if (ctx2) {
      this.ratingMultipleChart = new Chart(ctx2, {
        type: 'scatter',
        data: { datasets: [] },
        options: this.getChartOptions('Kriitikot (0-100)', 'Yleisö (0-100)', false),
      });
    }

    const ctx3 = this.budgetMultipleChartRef.nativeElement.getContext('2d');
    if (ctx3) {
      this.budgetMultipleChart = new Chart(ctx3, {
        type: 'scatter',
        data: { datasets: [] },
        options: this.getChartOptions('Budjetti ($M)', 'Äänimäärä', true),
      });
    }
  }

  private getChartOptions(xTitle: string, yTitle: string, logScale: boolean | {x: boolean, y: boolean}): ChartOptions {
    const isLogX = typeof logScale === 'boolean' ? logScale : logScale.x;
    const isLogY = typeof logScale === 'boolean' ? logScale : logScale.y;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#333',
            font: { size: 11 },
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#666',
          borderWidth: 1,
          callbacks: {
            label: (context: TooltipItem<'scatter'>) => {
              const raw = context.raw as DataPoint;
              if (raw && raw.movieContext) {
                const title = raw.movieContext.title || 'Tuntematon';
                const year = raw.movieContext.year ? ` (${raw.movieContext.year})` : '';
                const datasetLabel = context.dataset.label || '';
                let xLabel = 'X';
                let yLabel = 'Y';

                if (datasetLabel === 'Elokuvat') {
                  if (context.chart === this.budgetRevenueChart) {
                    xLabel = 'Budjetti';
                    yLabel = 'Tuotto';
                  } else if (context.chart === this.ratingMultipleChart) {
                    xLabel = 'Kriitikot';
                    yLabel = 'Yleisö';
                  } else if (context.chart === this.budgetMultipleChart) {
                    xLabel = 'Budjetti';
                    yLabel = 'Äänimäärä';
                  }
                }
                return `${title}${year}: ${xLabel} ${raw.x?.toFixed(2)}, ${yLabel} ${raw.y?.toFixed(2)}`;
              }
              return `${raw.x?.toFixed(2)}, ${raw.y?.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: isLogX ? 'logarithmic' : 'linear',
          title: { display: true, text: xTitle, color: '#333', font: { size: 12 } },
          grid: { color: '#e5e7eb' },
          ticks: { color: '#666', font: { size: 10 } },
        },
        y: {
          type: isLogY ? 'logarithmic' : 'linear',
          title: { display: true, text: yTitle, color: '#333', font: { size: 12 } },
          grid: { color: '#e5e7eb' },
          ticks: { color: '#666', font: { size: 10 } },
        },
      },
    };
  }
  private calculateRegression(data: DataPoint[]): RegressionResult | null {
    if (data.length < 5) return null;

    const n = data.length;
    const sumX = data.reduce((a, b) => a + b.x, 0);
    const sumY = data.reduce((a, b) => a + b.y, 0);
    const sumXY = data.reduce((a, b) => a + b.x * b.y, 0);
    const sumX2 = data.reduce((a, b) => a + b.x * b.x, 0);
    const sumY2 = data.reduce((a, b) => a + b.y * b.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const num = (n * sumXY - sumX * sumY) * (n * sumXY - sumX * sumY);
    const den = (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY);
    const r2 = den === 0 ? 0 : num / den;

    const avgX = sumX / n;
    const predicted = slope * avgX + intercept;

    return { slope, intercept, r2, predicted, n };
  }

  private calculateLogRegression(data: DataPoint[]): RegressionResult | null {
    
    const validData = data.filter((d) => d.x > 0);
    if (validData.length < 5) return null;

    const logData = validData.map((d) => ({
      x: Math.log10(d.x),
      y: Math.log10(Math.max(0.01, d.y)),
    }));

    return this.calculateRegression(logData);
  }

  private calculateSemiLogYRegression(data: DataPoint[]): RegressionResult | null {
    const validData = data.filter((d) => d.y > 0);
    if (validData.length < 5) return null;

    const logData = validData.map((d) => ({
      x: d.x,
      y: Math.log10(Math.max(0.01, d.y)),
    }));

    return this.calculateRegression(logData);
  }

  private createLinePoints(
    result: RegressionResult,
    xMin: number,
    xMax: number,
    isLogScale: boolean = false,
  ): DataPoint[] {
    if (isLogScale) {
      const points: DataPoint[] = [];
      const steps = 50;
      const logXMin = Math.log10(Math.max(0.01, xMin));
      const logXMax = Math.log10(xMax);
      for (let i = 0; i <= steps; i++) {
        const logX = logXMin + (logXMax - logXMin) * (i / steps);
        const logY = result.slope * logX + result.intercept;
        const x = Math.pow(10, logX);
        const y = Math.pow(10, logY);
        points.push({ x, y });
      }
      return points;
    }
    return [
      { x: xMin, y: result.slope * xMin + result.intercept },
      { x: xMax, y: result.slope * xMax + result.intercept },
    ];
  }

  private createSemiLogYLinePoints(
    result: RegressionResult,
    xMin: number,
    xMax: number,
  ): DataPoint[] {
    const points: DataPoint[] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
        const x = xMin + (xMax - xMin) * (i / steps);
        const logY = result.slope * x + result.intercept;
        const y = Math.pow(10, logY);
        points.push({ x, y });
    }
    return points;
  }

  updateAllRegressions() {
    
    const budgetRevenueData = this.filteredMovies
      .map((m: Movie) => {
        const budget = Number(m.budget);
        const revenue = Number(m.revenue);
        if (isFinite(budget) && budget > 0) {
          const rev = isFinite(revenue) ? revenue : 0;
          return { x: budget / 1000000, y: rev / 1000000, movieContext: m };
        }
        return null;
      })
      .filter((d) => d !== null) as DataPoint[];

    const brResult = this.calculateLogRegression(budgetRevenueData);
    this.budgetRevenueResult.set(brResult);

    if (this.budgetRevenueChart && brResult && budgetRevenueData.length > 0) {
      const maxX = Math.max(...budgetRevenueData.map((d) => d.x));
      const minX = Math.min(...budgetRevenueData.map((d) => d.x));

      this.budgetRevenueChart.data.datasets = [
        {
          label: `Regressio (R²=${brResult.r2.toFixed(3)})`,
          data: this.createLinePoints(brResult, minX, maxX, true),
          type: 'line' as const,
          borderColor: '#dc2626',
          backgroundColor: '#dc2626',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          spanGaps: true,
        },
        {
          label: 'Elokuvat',
          data: budgetRevenueData,
          backgroundColor: 'rgba(37, 99, 235, 0.6)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 1,
          pointRadius: 3,
        },
      ];
      this.budgetRevenueChart.update();
    }

    
    const ratingMultipleData = this.filteredMovies
      .map((m: Movie) => {
        const critic = Number(m.tomatometer_rating) || Number(m.metascore) || null;
        const audience = Number(m.audience_rating) || Number(m.vote_average_100) || null;

        if (critic && audience) {
          return {
            x: critic,
            y: audience,
            movieContext: m,
          };
        }
        return null;
      })
      .filter((d) => d !== null) as DataPoint[];

    const rrResult = this.calculateRegression(ratingMultipleData);
    this.ratingMultipleResult.set(rrResult);

    if (this.ratingMultipleChart && rrResult && ratingMultipleData.length > 0) {
      const minX = Math.min(...ratingMultipleData.map((d) => d.x));
      const maxX = Math.max(...ratingMultipleData.map((d) => d.x));

      this.ratingMultipleChart.data.datasets = [
        {
          label: `Regressio (R²=${rrResult.r2.toFixed(3)})`,
          data: this.createLinePoints(rrResult, minX, maxX, false),
          type: 'line' as const,
          borderColor: '#dc2626',
          backgroundColor: '#dc2626',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Elokuvat',
          data: ratingMultipleData,
          backgroundColor: 'rgba(37, 99, 235, 0.6)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 1,
          pointRadius: 3,
        },
      ];
      this.ratingMultipleChart.update();
    }

    
    const budgetMultipleData = this.filteredMovies
      .map((m: Movie) => {
        const budget = Number(m.budget);
        const votes = Number(m.vote_count);

        if (isFinite(budget) && budget > 0) {
          const v = isFinite(votes) && votes > 0 ? votes : 1;
          return { x: budget / 1000000, y: v, movieContext: m };
        }
        return null;
      })
      .filter((d) => d !== null) as DataPoint[];

    const broResult = this.calculateLogRegression(budgetMultipleData);
    this.budgetMultipleResult.set(broResult);

    if (this.budgetMultipleChart && broResult && budgetMultipleData.length > 0) {
      const maxX = Math.max(...budgetMultipleData.map((d) => d.x));
      const minX = Math.min(...budgetMultipleData.map((d) => d.x));

      this.budgetMultipleChart.data.datasets = [
        {
          label: `Regressio (R²=${broResult.r2.toFixed(3)})`,
          data: this.createLinePoints(broResult, minX, maxX, true),
          type: 'line' as const,
          borderColor: '#dc2626',
          backgroundColor: '#dc2626',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          spanGaps: true,
        },
        {
          label: 'Elokuvat',
          data: budgetMultipleData,
          backgroundColor: 'rgba(37, 99, 235, 0.6)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 1,
          pointRadius: 3,
        },
      ];
      this.budgetMultipleChart.update();
    }
  }
}
