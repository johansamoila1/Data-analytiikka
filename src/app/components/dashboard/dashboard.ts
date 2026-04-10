import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { MovieService } from '../../services/movie';
import { ExtendedMovieService } from '../../services/extended-movie';
import { Movie } from '../../models/movie.model';
import { BasicMovie } from '../../models/basic-movie.model';
import { forkJoin } from 'rxjs';

import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';

import { OverviewAnalysis } from '../overview-analysis/overview-analysis';
import { GenreAnalysis } from '../genre-analysis/genre-analysis';
import { RatingComparison } from '../rating-comparison/rating-comparison';
import { YearTrends } from '../year-trends/year-trends';
import { RegressionAnalysis } from '../regression-analysis/regression-analysis';
import { ProfitabilityAnalysis } from '../profitability-analysis/profitability-analysis';
import { VerdictCard } from '../verdict-card/verdict-card';
import { AnalysisInfo } from '../analysis-info/analysis-info';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSliderModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    OverviewAnalysis,
    GenreAnalysis,
    RatingComparison,
    YearTrends,
    RegressionAnalysis,
    ProfitabilityAnalysis,
    VerdictCard,
    AnalysisInfo,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private movieService = inject(MovieService);
  private extendedMovieService = inject(ExtendedMovieService);
  private fb = inject(FormBuilder);

  movies: Movie[] = [];
  filteredMovies: Movie[] = [];
  filteredMovieOptions: Movie[] = [];
  selectedMovie: Movie | null = null;
  selectedMovies: Movie[] = [];
  datasetMaxBudget = 0;

  extendedMovies: BasicMovie[] = [];
  filteredExtendedMovies: BasicMovie[] = [];

  genreOptions = [
    { label: 'Toiminta', value: 'Action' },
    { label: 'Sci-fi', value: 'Science Fiction' },
    { label: 'Seikkailu', value: 'Adventure' },
    { label: 'Draama', value: 'Drama' },
    { label: 'Fantasia', value: 'Fantasy' },
    { label: 'Komedia', value: 'Comedy' },
    { label: 'Romantiikka', value: 'Romance' },
    { label: 'Lännenelokuva', value: 'Western' },
    { label: 'Rikos', value: 'Crime' },
    { label: 'Trilleri', value: 'Thriller' },
    { label: 'Mysteeri', value: 'Mystery' },
    { label: 'Perhe', value: 'Family' },
    { label: 'Sota', value: 'War' },
    { label: 'Animaatio', value: 'Animation' },
    { label: 'Kauhu', value: 'Horror' },
    { label: 'Musiikki', value: 'Music' },
    { label: 'Historia', value: 'History' },
    { label: 'Dokumentti', value: 'Documentary' },
    { label: 'TV-elokuva', value: 'TV Movie' },
  ];

  filterForm: FormGroup;
  allGenreValues: string[];
  movieSearchControl = new FormControl('');
  activeView = signal<string>('overview');

  setView(view: string) {
    this.activeView.set(view);
  }

  constructor() {
    this.allGenreValues = this.genreOptions.map((g) => g.value);

    this.filterForm = this.fb.group({
      selectedGenres: [this.allGenreValues],
      minYear: [2000],
      maxYear: [2020],
      sliderMinVal: [0],
      sliderMaxVal: [100],
      minBudgetLiteral: [10000],
      maxBudgetLiteral: [null],
      minRating: [0],
    });
  }

  ngOnInit() {
    forkJoin({
      ratedMovies: this.movieService.getMovies(),
      extendedMovies: this.extendedMovieService.getExtendedMovies(),
    }).subscribe(({ ratedMovies, extendedMovies }) => {
      this.movies = ratedMovies;
      this.extendedMovies = extendedMovies;

      let maxFound = 0;
      for (const m of ratedMovies) {
        const b = Number(m.budget) || 0;
        if (b > maxFound) maxFound = b;
      }
      if (maxFound > 0) {
        this.datasetMaxBudget = maxFound;
        this.filterForm.patchValue(
          {
            maxBudgetLiteral: maxFound,
            sliderMaxVal: 100,
          },
          { emitEvent: false },
        );
      }

      this.updateMovieSearchOptions();
      this.applyFilters();
      this.setupReactiveFilters();
    });
  }

  setupReactiveFilters() {
    const updateAll = () => {
      this.applyFilters();
      this.updateMovieSearchOptions();
    };

    this.filterForm
      .get('sliderMinVal')
      ?.valueChanges.pipe(debounceTime(50))
      .subscribe((val) => {
        this.filterForm
          .get('minBudgetLiteral')
          ?.setValue(Math.round(this.sliderToBudget(val)), { emitEvent: false });
        updateAll();
      });

    this.filterForm
      .get('sliderMaxVal')
      ?.valueChanges.pipe(debounceTime(50))
      .subscribe((val) => {
        this.filterForm
          .get('maxBudgetLiteral')
          ?.setValue(Math.round(this.sliderToBudget(val)), { emitEvent: false });
        updateAll();
      });

    this.filterForm
      .get('minBudgetLiteral')
      ?.valueChanges.pipe(debounceTime(50))
      .subscribe(() => {
        this.filterForm
          .get('sliderMinVal')
          ?.setValue(this.budgetToSlider(this.filterForm.get('minBudgetLiteral')?.value), {
            emitEvent: false,
          });
        updateAll();
      });

    this.filterForm
      .get('maxBudgetLiteral')
      ?.valueChanges.pipe(debounceTime(50))
      .subscribe(() => {
        this.filterForm
          .get('sliderMaxVal')
          ?.setValue(this.budgetToSlider(this.filterForm.get('maxBudgetLiteral')?.value), {
            emitEvent: false,
          });
        updateAll();
      });

    ['minYear', 'maxYear', 'selectedGenres'].forEach((field) => {
      this.filterForm
        .get(field)
        ?.valueChanges.pipe(debounceTime(50))
        .subscribe(() => {
          if (field === 'selectedGenres') {
            this.updateMovieSearchOptions();
          }
          updateAll();
        });
    });

    this.filterForm
      .get('minRating')
      ?.valueChanges.pipe(debounceTime(50))
      .subscribe(() => {
        updateAll();
      });
  }

  onSearchInput(_event: Event) {
    this.updateMovieSearchOptions();
    this.selectedMovie = null;
  }

  updateMovieSearchOptions() {
    const val = this.movieSearchControl.value;
    const searchStr = typeof val === 'string' ? val.toLowerCase().trim() : '';

    const selectedGenres = (this.filterForm.get('selectedGenres')?.value ?? []) as string[];
    const hasGenres = selectedGenres.length > 0 && selectedGenres.length < this.genreOptions.length;

    let availableMovies = this.movies;

    if (hasGenres) {
      availableMovies = this.movies.filter((m: Movie) => {
        const movieGenres = m.genres ? m.genres.split(',').map((g: string) => g.trim()) : [];
        return selectedGenres.some((g: string) => movieGenres.includes(g));
      });
    }

    if (searchStr && searchStr.length > 0) {
      this.filteredMovieOptions = availableMovies
        .filter((m: Movie) => {
          const cleanTitle = m.title_clean
            ? String(m.title_clean).toLowerCase()
            : String(m.title || '').toLowerCase();
          return cleanTitle.includes(searchStr);
        })
        .slice(0, 100);
    } else {
      this.filteredMovieOptions = availableMovies.slice(0, 100);
    }
  }

  displayFn(movie: string | Movie | null): string {
    if (!movie) return '';
    if (typeof movie === 'string') return movie;
    return movie.title != null ? String(movie.title) : '';
  }

  onMovieSelected(event: MatAutocompleteSelectedEvent) {
    const movie = event.option.value as Movie;
    if (!this.selectedMovies.find((m) => m.title === movie.title)) {
      this.selectedMovies = [...this.selectedMovies, movie];
    }
    this.selectedMovie = movie;
    this.movieSearchControl.setValue('');
    this.updateMovieSearchOptions();
  }

  removeSelectedMovie(movie: Movie) {
    this.selectedMovies = this.selectedMovies.filter((m) => m.title !== movie.title);
    if (this.selectedMovie?.title === movie.title) {
      this.selectedMovie = null;
    }
  }

  clearAllSelectedMovies() {
    this.selectedMovies = [];
    this.selectedMovie = null;
    this.movieSearchControl.setValue('');
  }

  onInternalMovieSelected(movie: Movie) {
    this.selectedMovie = movie;
    this.movieSearchControl.setValue(String(movie.title), { emitEvent: false });
  }

  clearGenres() {
    this.filterForm.get('selectedGenres')?.setValue([]);
  }

  clearMovieSearch() {
    this.selectedMovie = null;
    this.movieSearchControl.setValue('');
    this.updateMovieSearchOptions();
  }

  private isValidRating(val: string | number | null | undefined): boolean {
    if (val === null || val === undefined || val === '') return false;
    return !Number.isNaN(Number(val));
  }

  applyFilters() {
    const { minYear, maxYear, minRating } = this.filterForm.value;
    const minBudget = this.filterForm.get('minBudgetLiteral')?.value || 0;
    const maxBudget = this.filterForm.get('maxBudgetLiteral')?.value;
    const selectedGenres = (this.filterForm.get('selectedGenres')?.value ?? []) as string[];
    const hasGenres = selectedGenres.length > 0 && selectedGenres.length < this.genreOptions.length;

    
    this.filteredMovies = this.movies.filter((m: Movie) => {
      const year = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
      if (year && (year < minYear || year > maxYear)) return false;

      if (hasGenres) {
        const movieGenres = m.genres ? m.genres.split(',').map((g: string) => g.trim()) : [];
        if (!selectedGenres.some((g: string) => movieGenres.includes(g))) return false;
      }

      const budget = Number(m.budget) || 0;
      if (minBudget > 0 && budget > 0 && budget < minBudget) return false;
      if (maxBudget != null && budget > 0 && budget > maxBudget) return false;

      if (minRating > 0) {
        const ratings = [
          m.vote_average_100,
          m.audience_rating,
          m.tomatometer_rating,
          m.letterbox_rating,
          m.metascore,
        ]
          .filter((r) => this.isValidRating(r))
          .map(Number);

        if (ratings.length === 0) return false;

        const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        if (avgRating < minRating) return false;
      }

      return true;
    });

    
    this.filteredExtendedMovies = this.extendedMovies.filter((m: BasicMovie) => {
      const year = typeof m.year === 'number' ? m.year : parseInt(m.year as string, 10);
      if (year && (year < minYear || year > maxYear)) return false;

      if (hasGenres) {
        const movieGenres = m.genres ? m.genres.split(',').map((g: string) => g.trim()) : [];
        if (!selectedGenres.some((g: string) => movieGenres.includes(g))) return false;
      }

      const budget = Number(m.budget) || 0;
      if (minBudget > 0 && budget > 0 && budget < minBudget) return false;
      if (maxBudget != null && budget > 0 && budget > maxBudget) return false;

      return true;
    });
  }

  private budgetToSlider(num: number): number {
    const minB = 10000;
    if (!num || num <= minB) return 0;
    if (num >= this.datasetMaxBudget) return 100;
    return Math.pow((num - minB) / (this.datasetMaxBudget - minB), 1 / 3) * 100;
  }

  private sliderToBudget(val: number): number {
    const minB = 10000;
    if (val === 0) return minB;
    if (val === 100) return this.datasetMaxBudget;
    return minB + Math.pow(val / 100, 3) * (this.datasetMaxBudget - minB);
  }

  resetFilters() {
    this.filterForm.reset({
      selectedGenres: this.allGenreValues,
      minYear: 2000,
      maxYear: 2020,
      sliderMinVal: 0,
      sliderMaxVal: 100,
      minBudgetLiteral: 10000,
      maxBudgetLiteral: this.datasetMaxBudget,
      minRating: 0,
    });
    this.applyFilters();
    this.clearMovieSearch();
  }
}
