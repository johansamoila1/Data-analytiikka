import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-analysis-info',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './analysis-info.html',
  styleUrls: ['./analysis-info.css'],
})
export class AnalysisInfo {}
