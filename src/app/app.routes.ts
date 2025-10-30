import { Routes } from '@angular/router';
import { NotifyComponent } from './pages/notify/notify.component';

export const routes: Routes = [
    { path: '', redirectTo: 'transfer', pathMatch: 'full' },
    { path: 'transfer', loadComponent: () => import('./features/transfer/sender/sender.page').then(m => m.SenderPage) },
    { path: 'display', loadComponent: () => import('./features/transfer/receiver/receiver.page').then(m => m.ReceiverPage) },
    {
        path: 'admin',
        loadComponent: () =>
            import('./features/admin/admin.page/admin.page').then(m => m.AdminPage),
    },
    { path: 'notify', component: NotifyComponent },
    { path: '**', redirectTo: 'transfer' }
];