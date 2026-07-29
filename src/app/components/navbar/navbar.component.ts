import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { visibleNavigationItems } from '../../config/navigation.config';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly isMenuOpen = signal(false);
  readonly isDropdownOpen = signal(false);
  readonly primaryNavigationItems = visibleNavigationItems('primary');
  readonly moreNavigationItems = visibleNavigationItems('more');

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  closeAll(): void {
    this.closeMenu();
    this.closeDropdown();
  }
}
