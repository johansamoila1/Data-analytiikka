import { Component, Input, ViewChild, ElementRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Movie } from '../../models/movie.model';
import { BasicMovie } from '../../models/basic-movie.model';
import Chart from 'chart.js/auto';

interface BudgetCategoryStats {
  label: string;
  count: number;
  medianMultiple: number;
  profitable: number;
  profitablePercent: number;
}

@Component({
  selector: 'app-profitability-analysis',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './profitability-analysis.html',
  styleUrls: ['./profitability-analysis.css']
})
export class ProfitabilityAnalysis implements OnInit, OnChanges {
  @Input() filteredMovies: Movie[] = [];
  @Input() extendedMovies: BasicMovie[] = [];

  @ViewChild('histogramChart', { static: true }) histogramChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('budgetCategoryChart', { static: true }) budgetCategoryChartRef!: ElementRef<HTMLCanvasElement>;
  
  histogramChart: Chart | null = null;
  budgetCategoryChart: Chart | null = null;

  ngOnInit() {
    this.initHistogramChart();
    this.initBudgetCategoryChart();
    this.updateAll();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filteredMovies'] || changes['extendedMovies']) {
      this.updateAll();
    }
  }

  updateAll() {
    this.updateHistogram();
    this.updateBudgetCategoryAnalysis();
  }

  private calculateMultiple(movie: Movie | BasicMovie): number {
    const budget = Number(movie.budget) || 0;
    const revenue = Number(movie.revenue) || 0;
    if (budget <= 0 || revenue <= 0) return NaN; 
    return revenue / budget;
  }

  initHistogramChart() {
    const ctx = this.histogramChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.histogramChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
        plugins: {
          legend: { display: false, labels: { color: '#333' } },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            callbacks: {
              label: (ctx: any) => `${ctx.raw} elokuvaa`
            }
          }
        },
        scales: {
          x: { 
            title: { display: true, text: 'Tuottokerroin (Revenue / Budget)', color: '#333' }, 
            grid: { display: false }, 
            ticks: { color: '#666' },
            border: { display: true, color: '#e5e7eb' }
          },
          y: { 
            title: { display: true, text: 'Lukumäärä', color: '#333' }, 
            grid: { color: '#e5e7eb' }, 
            ticks: { color: '#666' },
            beginAtZero: true
          }
        }
      }
    });
  }

  initBudgetCategoryChart() {
    const ctx = this.budgetCategoryChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.budgetCategoryChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#333' } },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            callbacks: {
              label: (ctx: any) => {
                const label = ctx.dataset.label;
                const val = ctx.raw;
                if (label === 'Mediaani tuottokerroin') return `Kerroin: ${val.toFixed(2)}`;
                if (label === 'Lukumäärä') return `Määrä: ${val}`;
                return '';
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Budjettiluokka', color: '#333' }, grid: { color: '#e5e7eb' }, ticks: { color: '#666' } },
          y: { 
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Mediaani tuottokerroin', color: '#333' },
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Lukumäärä', color: '#333' },
            grid: { drawOnChartArea: false },
            ticks: { color: '#666' }
          }
        }
      }
    });
  }

  updateHistogram() {
    const hasExtended = this.extendedMovies && this.extendedMovies.length > 0;
    
    
    let multipleValues: number[] = [];
    
    
    const validFiltered = this.filteredMovies.filter(m => {
      const budget = Number(m.budget) || 0;
      const revenue = Number(m.revenue) || 0;
      return budget > 0 && revenue > 0;
    });
    
    multipleValues = validFiltered
      .map(m => this.calculateMultiple(m))
      .filter(v => !isNaN(v));
    
    
    if (hasExtended) {
      const extendedMultiples = this.extendedMovies
        .map(m => this.calculateMultiple(m))
        .filter(v => !isNaN(v));
      multipleValues = [...multipleValues, ...extendedMultiples];
    }

    if (multipleValues.length === 0) {
      if (this.histogramChart) {
        this.histogramChart.data.labels = [];
        this.histogramChart.data.datasets = [];
        this.histogramChart.update();
      }
      return;
    }

    const bins = [
      { label: '< 0.5×', min: -Infinity, max: 0.5 },
      { label: '0.5–1×', min: 0.5, max: 1 },
      { label: '1–2×', min: 1, max: 2 },
      { label: '2–5×', min: 2, max: 5 },
      { label: '5–10×', min: 5, max: 10 },
      { label: '10–20×', min: 10, max: 20 },
      { label: '> 20×', min: 20, max: Infinity }
    ];

    const counts = bins.map(bin => multipleValues.filter(v => v >= bin.min && v < bin.max).length);

    if (this.histogramChart) {
      this.histogramChart.data.labels = bins.map(b => b.label);
      this.histogramChart.data.datasets = [{
        label: 'Elokuvia',
        data: counts,
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
        borderSkipped: false
      }];
      this.histogramChart.update();
    }
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  updateBudgetCategoryAnalysis() {
    const hasExtended = this.extendedMovies && this.extendedMovies.length > 0;
    
    
    const categories = [
      { label: 'Indie (<5M$)', min: 10000, max: 5000000 },
      { label: 'Mid-budget (5M-50M$)', min: 5000000, max: 50000000 },
      { label: 'Blockbuster (>50M$)', min: 50000000, max: Infinity }
    ];

    const stats: BudgetCategoryStats[] = categories.map(cat => {
      
      const movies = this.filteredMovies.filter(m => {
        const budget = Number(m.budget) || 0;
        const revenue = Number(m.revenue) || 0;
        return budget > 0 && revenue > 0 && budget >= cat.min && budget < cat.max;
      });
      
      
      const extendedInCat = hasExtended ? this.extendedMovies.filter(m => {
        const budget = Number(m.budget) || 0;
        const revenue = Number(m.revenue) || 0;
        return budget > 0 && revenue > 0 && budget >= cat.min && budget < cat.max;
      }) : [];

      
      const getMultiple = (m: Movie | BasicMovie): number => {
        const budget = Number(m.budget) || 0;
        const revenue = Number(m.revenue) || 0;
        return budget > 0 ? revenue / budget : NaN;
      };

      const allMultiples = [...movies, ...extendedInCat]
        .map(m => getMultiple(m))
        .filter(v => !isNaN(v));

      
      const medianMultiple = this.percentile(allMultiples, 50);
      
      
      
      const profitable = allMultiples.filter(v => v > 2.0).length;

      return {
        label: cat.label,
        count: allMultiples.length,
        medianMultiple,
        profitable,
        profitablePercent: allMultiples.length > 0 ? (profitable / allMultiples.length) * 100 : 0
      };
    });

    if (this.budgetCategoryChart) {
      this.budgetCategoryChart.data.labels = stats.map(s => s.label);
      this.budgetCategoryChart.data.datasets = [
        {
          label: 'Mediaani tuottokerroin',
          data: stats.map(s => s.medianMultiple),
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 0.8)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Lukumäärä',
          data: stats.map(s => s.count),
          backgroundColor: 'rgba(220, 38, 38, 0.8)',
          borderColor: 'rgba(220, 38, 38, 0.8)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ];
      this.budgetCategoryChart.update();
    }
  }
}
