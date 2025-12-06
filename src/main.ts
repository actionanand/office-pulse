import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Import utilities for browser console access
import './app/lock-screen/lock-screen.utils';
import './app/logger/logger.utils';

bootstrapApplication(App, appConfig).catch(err => console.error(err));
