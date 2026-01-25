import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Bookmark, BookmarksResponse } from '../models/bookmark.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BookmarkService {
  private readonly GOOGLE_SHEET_ID = environment.GOOGLE_SHEET_ID;
  private readonly BOOKMARK_SHEET_GID = environment.BOOKMARK_SHEET_GID;
  private http = inject(HttpClient);

  /**
   * Fetch bookmarks from Google Sheets
   */
  fetchBookmarks(): Observable<BookmarksResponse> {
    const url = `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.BOOKMARK_SHEET_GID}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map((response: string) => {
        const data = this.parseBookmarkResponse(response);
        return data;
      }),
      catchError((error: unknown) => {
        console.error('Error fetching bookmarks:', error);
        return of({ bookmarks: [] });
      }),
    );
  }

  /**
   * Parse Google Sheets JSON response
   */
  private parseBookmarkResponse(response: string): BookmarksResponse {
    try {
      // Remove the wrapper: google.visualization.Query.setResponse({...})
      const jsonMatch = response.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
      if (!jsonMatch) {
        console.error('Invalid response format');
        return { bookmarks: [] };
      }

      const jsonData = JSON.parse(jsonMatch[1]);
      const rows = jsonData.table?.rows || [];

      const bookmarks: Bookmark[] = [];

      // Process all rows (skip header)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.c || [];

        // Expected columns: S No, Title, Url, Comment
        const sno = cells[0]?.v;
        const title = cells[1]?.v || '';
        const url = cells[2]?.v || '';
        const comment = cells[3]?.v || '';

        // Skip rows with null or invalid S No
        if (sno === null || sno === undefined || sno === '') {
          continue;
        }

        bookmarks.push({
          sno: Number(sno),
          title: String(title).trim(),
          url: String(url).trim(),
          comment: String(comment).trim(),
        });
      }

      return { bookmarks };
    } catch (error) {
      console.error('Error parsing bookmark response:', error);
      return { bookmarks: [] };
    }
  }
}
