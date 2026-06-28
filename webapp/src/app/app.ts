import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly menuOpen = signal(false);

  protected readonly links = [
    { path: '/', label: 'Home', exact: true },
    { path: '/awards', label: 'Awards', exact: false },
    { path: '/categories', label: 'Categories', exact: false },
    { path: '/speeches', label: 'Speeches', exact: false },
    { path: '/ontology', label: 'Knowledge Graph', exact: false },
    { path: '/about', label: 'About', exact: false },
  ];

  toggle(): void {
    this.menuOpen.update((v) => !v);
  }
  close(): void {
    this.menuOpen.set(false);
  }
}
