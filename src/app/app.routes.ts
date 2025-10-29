import { Routes } from '@angular/router';


export const routes: Routes = [
    { path: '', redirectTo: 'transfer', pathMatch: 'full' },
    { path: 'transfer', loadComponent: () => import('./features/transfer/sender/sender.page').then(m => m.SenderPage) },
    { path: 'display', loadComponent: () => import('./features/transfer/receiver/receiver.page').then(m => m.ReceiverPage) },
    { path: '**', redirectTo: 'transfer' }
];