import { Component, Input, ViewChild, ElementRef, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BasicMovie } from '../../models/basic-movie.model';
import Chart, { TooltipItem } from 'chart.js/auto';

interface GenreStat {
  genre: string;
  count: number;
  median: number;
}

@Component({
  selector: 'app-genre-analysis',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './genre-analysis.html',
  styleUrls: ['./genre-analysis.css']
})
export class GenreAnalysis implements OnInit, OnChanges {
  @Input() extendedMovies: BasicMovie[] = [];
  @Input() genreOptions: {label: string, value: string}[] = [];
  @Input() selectedGenres: string[] = [];

  @ViewChild('genreChart', { static: true }) genreChartRef!: ElementRef<HTMLCanvasElement>;
  genreChart: Chart | null = null;

  genreStats = signal<GenreStat[]>([]);
  movieCountInfo = signal<{totalRated: number}>({totalRated: 0});

  ngOnInit() {
    this.initGenreChart();
    this.updateGenreAnalysis();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.genreChart && (changes['extendedMovies'] || changes['selectedGenres'])) {
      this.updateGenreAnalysis();
    }
  }

  initGenreChart() {
    const ctx = this.genreChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.genreChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
        indexAxis: 'y',
        plugins: {
          legend: { display: false, labels: { color: '#333' } },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const stats = this.genreStats();
                const stat = stats[ctx.dataIndex];
                return stat ? `Mediaani ROI: ${stat.median.toFixed(2)}, Lkm: ${stat.count}` : '';
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Mediaani ROI', color: '#333', font: { size: 13 } },
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 }, callback: (v: string | number) => Number(v).toFixed(1) }
          },
          y: {
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 } }
          }
        }
      }
    });
  }

  updateGenreAnalysis() {
    if (!this.extendedMovies || this.extendedMovies.length === 0) {
      this.genreStats.set([]);
      this.movieCountInfo.set({ totalRated: 0 });
      return;
    }

    
    const validMovies = this.extendedMovies.filter(m => {
      const budget = Number(m.budget) || 0;
      const revenue = Number(m.revenue) || 0;
      return budget > 0 && revenue > 0;
    });

    const allGenres = this.genreOptions.map(g => g.value);
    const stats: GenreStat[] = [];

    for (const genre of allGenres) {
      const roiValues: number[] = [];
      
      for (const m of validMovies) {
        const movieGenres = m.genres ? m.genres.split(',').map((g: string) => g.trim()) : [];
        if (!movieGenres.includes(genre)) continue;
        
        const budget = Number(m.budget) || 0;
        const revenue = Number(m.revenue) || 0;
        
        
        const studioRevenue = revenue * 0.5;
        const roi = (studioRevenue - budget) / budget;
        
        if (!isNaN(roi)) roiValues.push(roi);
      }
      
      if (roiValues.length < 3) continue;

      roiValues.sort((a, b) => a - b);
      const count = roiValues.length;
      const median = this.percentile(roiValues, 50);

      stats.push({ genre, count, median });
    }

    const sortedStats = stats.sort((a, b) => b.median - a.median);
    this.genreStats.set(sortedStats);
    this.movieCountInfo.set({ totalRated: validMovies.length });

    if (this.genreChart) {
      const sorted = this.genreStats();
      this.genreChart.data.labels = sorted.map(s => this.genreOptions.find(g => g.value === s.genre)?.label || s.genre);
      this.genreChart.data.datasets = [{
        label: 'Mediaani ROI',
        data: sorted.map(s => s.median),
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderColor: 'rgba(37, 99, 235, 0.8)',
        borderWidth: 1,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }];
      this.genreChart.update();
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

  getGenreLabel(value: string): string {
    return this.genreOptions.find(g => g.value === value)?.label || value;
  }
}