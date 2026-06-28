import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
    title: 'Feminism & Cinema',
  },
  {
    path: 'awards',
    loadComponent: () => import('./pages/awards/awards').then((m) => m.AwardsPage),
    title: 'Awards over time · Feminism & Cinema',
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/categories/categories').then((m) => m.CategoriesPage),
    title: 'Categories · Feminism & Cinema',
  },
  {
    path: 'speeches',
    loadComponent: () => import('./pages/speeches/speeches').then((m) => m.SpeechesPage),
    title: 'Acceptance speeches · Feminism & Cinema',
  },
  {
    path: 'ontology',
    loadComponent: () => import('./pages/ontology/ontology').then((m) => m.OntologyPage),
    title: 'Knowledge graph · Feminism & Cinema',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then((m) => m.AboutPage),
    title: 'About · Feminism & Cinema',
  },
  { path: '**', redirectTo: '' },
];
