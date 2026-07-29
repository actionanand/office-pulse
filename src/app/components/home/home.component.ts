import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { visibleNavigationItems } from '../../config/navigation.config';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideDynamicIcon],
})
export class HomeComponent {
  readonly quickLinks = visibleNavigationItems()
    .filter(item => item.home)
    .map(item => ({
      path: `/${item.route}`,
      icon: item.icon,
      title: item.home!.title,
      description: item.home!.description,
      color: item.home!.color,
    }));

  readonly currentHour = new Date().getHours();

  get greeting(): string {
    if (this.currentHour >= 4 && this.currentHour < 6) return 'Rise and Shine!';
    if (this.currentHour >= 6 && this.currentHour < 12) return 'Good Morning';
    if (this.currentHour >= 12 && this.currentHour < 17) return 'Good Afternoon';
    if (this.currentHour >= 17 && this.currentHour < 21) return 'Good Evening';
    return 'Good Night';
  }
}
