export interface Bookmark {
  sno: number;
  title: string;
  url: string;
  comment: string;
}

export interface BookmarksResponse {
  bookmarks: Bookmark[];
}
