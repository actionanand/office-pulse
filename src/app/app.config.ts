import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withFetch } from '@angular/common/http';

import { MERMAID_OPTIONS, provideMarkdown, MARKED_OPTIONS } from 'ngx-markdown';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideMarkdown({
      loader: HttpClient,
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          breaks: false,
          gfm: true,
          pedantic: false,
        },
      },
      mermaidOptions: {
        provide: MERMAID_OPTIONS,
        useValue: {
          startOnLoad: true,
          theme: 'dark',
          look: 'classic',
          flowchart: { curve: 'basis' },
          gantt: { useMaxWidth: true },
        },
      },
    }),
  ],
};
