import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PushService } from '../../../../core/push.service';

@Component({
  standalone: true,
  selector: 'asm-admin.page',
  imports: [CommonModule],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss'
})

export class AdminPage {
  private push = inject(PushService);
  backendUrl = 'http://localhost/asemar-api';
  enable() { this.push.subscribeAdmin(this.backendUrl); }
}
