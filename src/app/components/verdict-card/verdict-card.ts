import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Movie } from '../../models/movie.model';
import { getWeightedScore } from '../../utils/movie-utils';


export interface VerdictScores {
  eliteScore: number | null;
  combinedAudienceScore: number | null;
}

@Component({
  selector: 'app-verdict-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './verdict-card.html',
  styleUrls: ['./verdict-card.css'],
})
export class VerdictCard implements OnChanges {
  @Input() movie: Movie | null = null;

  
  scores: VerdictScores = { eliteScore: null, combinedAudienceScore: null };

  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movie']) {
      this.updateScores();
    }
  }

  private updateScores(): void {
    if (!this.movie) {
      this.scores = { eliteScore: null, combinedAudienceScore: null };
      return;
    }

    const rawScores = getWeightedScore(this.movie);

    
    
    
    this.scores = {
      eliteScore:
        rawScores.eliteScore === null || Number.isNaN(rawScores.eliteScore)
          ? null
          : rawScores.eliteScore,
      combinedAudienceScore:
        rawScores.combinedAudienceScore === null || Number.isNaN(rawScores.combinedAudienceScore)
          ? null
          : rawScores.combinedAudienceScore,
    };
  }
}
