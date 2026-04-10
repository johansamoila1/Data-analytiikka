import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { BasicMovie } from '../models/basic-movie.model';

@Injectable({
  providedIn: 'root',
})
export class ExtendedMovieService {
  private http = inject(HttpClient);

  getExtendedMovies(): Observable<BasicMovie[]> {
    return this.http.get<BasicMovie[]>('moviedata2.json').pipe(
      catchError(err => {
        console.error('Failed to load extended movies', err);
        return of([] as BasicMovie[]);
      })
    );
  }
}
