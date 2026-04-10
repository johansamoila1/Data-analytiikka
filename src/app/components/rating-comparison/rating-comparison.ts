import { Component, Input, ViewChild, ElementRef, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Movie } from '../../models/movie.model';
import Chart, { TooltipItem } from 'chart.js/auto';

interface RatingDiff {
  title: string;
  diff: number;
  critic: number;
  audience: number;
}

@Component({
  selector: 'app-rating-comparison',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './rating-comparison.html',
  styleUrls: ['./rating-comparison.css']
})
export class RatingComparison implements OnInit, OnChanges {
  @Input() filteredMovies: Movie[] = [];

  @ViewChild('criticsChart', { static: true }) criticsChartRef!: ElementRef<HTMLCanvasElement>;
  criticsChart: Chart | null = null;

  criticsVsAudience = signal<RatingDiff[]>([]);

  ngOnInit() {
    this.initCriticsChart();
    this.updateCriticsVsAudience();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.criticsChart && changes['filteredMovies']) {
      this.updateCriticsVsAudience();
    }
  }

  private isValidRating(value: number | string | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    const num = Number(value);
    return !isNaN(num);
  }

  initCriticsChart() {
    const ctx = this.criticsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.criticsChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
        indexAxis: 'y',
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#333', font: { size: 12 } } },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const data = this.criticsVsAudience()[ctx.dataIndex];
                if (!data) return '';
                if (ctx.dataset.label === 'Kriitikot') return `Kriitikot: ${data.critic.toFixed(1)}`;
                if (ctx.dataset.label === 'Yleisö') return `Yleisö: ${data.audience.toFixed(1)}`;
                return '';
              },
              afterLabel: (ctx: TooltipItem<'bar'>) => {
                const data = this.criticsVsAudience()[ctx.dataIndex];
                if (!data) return '';
                const sign = data.diff > 0 ? '+' : '';
                return `Ero: ${sign}${data.diff.toFixed(1)}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Arvosana (0-100)', color: '#333', font: { size: 13 } },
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 } }
          },
          y: {
            grid: { color: '#e5e7eb' },
            ticks: { color: '#666', font: { size: 11 } }
          }
        }
      }
    });
  }

  updateCriticsVsAudience() {
    const validMovies = this.filteredMovies.filter(m => {
      const critic = Number(m.tomatometer_rating);
      const audience = Number(m.audience_rating);
      return this.isValidRating(m.tomatometer_rating) && 
             this.isValidRating(m.audience_rating) &&
             !isNaN(critic) && !isNaN(audience);
    });

    const diffs: RatingDiff[] = validMovies.map(m => {
      const critic = Number(m.tomatometer_rating);
      const audience = Number(m.audience_rating);
      return {
        title: String(m.title),
        critic,
        audience,
        diff: audience - critic 
      };
    });

    
    const topDiffs = diffs
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 20);

    this.criticsVsAudience.set(topDiffs);

    if (this.criticsChart) {
      this.criticsChart.data.labels = topDiffs.map(d => d.title);
      this.criticsChart.data.datasets = [
        {
          label: 'Kriitikot',
          data: topDiffs.map(d => d.critic),
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 0.8)',
          borderWidth: 1
        },
        {
          label: 'Yleisö',
          data: topDiffs.map(d => d.audience),
          backgroundColor: 'rgba(220, 38, 38, 0.8)',
          borderColor: 'rgba(220, 38, 38, 0.8)',
          borderWidth: 1
        }
      ];
      this.criticsChart.update();
    }
  }
}