import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', loadComponent: () => import('./home/home').then((m) => m.HomePage), title: 'Truco Party' },
  { path: 'mesa', loadComponent: () => import('./table/table').then((m) => m.TablePage), title: 'Truco Party · Mesa' },
  { path: '**', redirectTo: '' },
];
