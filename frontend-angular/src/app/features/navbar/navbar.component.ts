import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';
import { MatrixOrbComponent } from '../ai-assistant/matrix-orb.component';

export type NavigationTab = 'today' | 'weekly' | 'courses';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatrixOrbComponent],
  template: `
    <header class="pill-navbar-root">
      <div class="navbar-container">
        
        <!-- Left: Minimalist Dot & Brand Logo -->
        <div class="nav-left">
          <span class="brand-pulse-dot"></span>
          <button class="brand-btn" (click)="selectTab('today')">
            <span class="brand-text">UTP</span>
          </button>
        </div>

        <!-- Right: Pure Minimalist Editorial Navigation -->
        <div class="nav-right">
          <nav class="nav-links">
            @for (tab of navTabs; track tab.id) {
              <button 
                class="tab-link" 
                [class.active]="activeTab === tab.id"
                (click)="selectTab(tab.id)"
              >
                <span>{{ tab.label }}</span>
                @if (tab.dot) {
                  <span class="tab-ping-dot"></span>
                }
              </button>
            }

            <!-- Copilot Button -->
            <button class="copilot-btn" (click)="openAiModal.emit()">
              <app-matrix-orb [size]="14" [state]="'idle'"></app-matrix-orb>
              <span>COPILOTO</span>
            </button>
          </nav>

          <!-- Account Code Indicator -->
          <div class="account-pill" (click)="openSettings.emit()" title="Ajustes de cuenta">
            <span class="account-dot"></span>
            <span class="account-code mono">{{ authService.currentStudent()?.studentCode || 'U22204567' }}</span>
          </div>
        </div>

      </div>
    </header>

    <!-- Mobile Bottom Navigation Dock (Fixed to viewport bottom) -->
    <nav class="mobile-bottom-dock">
      <div class="dock-container">
        @for (tab of navTabs; track tab.id) {
          <button 
            class="dock-item" 
            [class.active]="activeTab === tab.id"
            (click)="selectTab(tab.id)"
          >
            <div class="dock-icon-wrapper">
              @if (tab.id === 'today') {
                <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                  <path d="m9 16 2 2 4-4"/>
                </svg>
              } @else if (tab.id === 'weekly') {
                <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              } @else if (tab.id === 'courses') {
                <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                  <path d="M6 6h10"/>
                  <path d="M6 10h10"/>
                </svg>
              }
              @if (tab.dot) {
                <span class="dock-ping-dot"></span>
              }
            </div>
            <span class="dock-label">{{ tab.label }}</span>
          </button>
        }

        <!-- Mobile Copilot Button -->
        <button class="dock-item copilot-dock-item" (click)="openAiModal.emit()">
          <div class="dock-icon-wrapper copilot-orb-wrapper">
            <app-matrix-orb [size]="18" [state]="'idle'"></app-matrix-orb>
          </div>
          <span class="dock-label copilot-label">COPILOTO</span>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    .pill-navbar-root {
      position: sticky;
      top: 0;
      z-index: 40;
      width: 100%;
      background: linear-gradient(to bottom, rgba(7, 7, 9, 0.85), rgba(7, 7, 9, 0.35), transparent);
      backdrop-filter: blur(12px);
      user-select: none;
    }
    .navbar-container {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 24px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .brand-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffffff;
      animation: pulse-dot 2s infinite;
    }
    .brand-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    .brand-text {
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.15em;
      color: #ffffff;
      text-transform: uppercase;
      transition: color 0.2s;
    }
    .brand-btn:hover .brand-text {
      color: var(--accent-lime);
    }
    .nav-right {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .tab-link {
      background: transparent;
      border: none;
      color: #a1a1aa;
      padding: 4px 0;
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.12em;
      cursor: pointer;
      border-bottom: 1px solid transparent;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .tab-link:hover {
      color: #ffffff;
    }
    .tab-link.active {
      color: #ffffff;
      font-weight: 800;
      border-bottom: 1px dashed #ffffff;
    }
    .tab-ping-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--accent-lime);
      animation: ping 1.5s infinite;
    }
    .copilot-btn {
      background: transparent;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #d4d4d8;
      cursor: pointer;
      transition: color 0.2s;
    }
    .copilot-btn:hover {
      color: var(--accent-lime);
    }
    .account-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      padding-left: 14px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .account-pill:hover {
      opacity: 0.8;
    }
    .account-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-lime);
    }
    .account-code {
      font-size: 10.5px;
      color: #d4d4d8;
      letter-spacing: 0.08em;
    }
    :host {
      display: block;
    }

    /* Mobile Bottom Navigation Dock */
    .mobile-bottom-dock {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100vw;
      z-index: 40;
      background: rgba(10, 10, 14, 0.96);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 12px;
      padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6);
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      -webkit-tap-highlight-color: transparent;
    }

    .dock-container {
      display: flex;
      align-items: center;
      justify-content: space-around;
      max-width: 440px;
      margin: 0 auto;
      width: 100%;
    }

    .dock-item {
      background: transparent;
      border: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 6px 12px;
      border-radius: 12px;
      color: #71717a;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      touch-action: manipulation;
      user-select: none;
    }

    .dock-item:active {
      transform: scale(0.92);
    }

    .dock-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 22px;
    }

    .dock-icon {
      width: 20px;
      height: 20px;
      transition: color 0.2s, transform 0.2s;
    }

    .dock-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition: color 0.2s;
    }

    .dock-item.active {
      color: #ffffff;
    }

    .dock-item.active .dock-icon {
      color: var(--accent-lime, #d4ff00);
      transform: translateY(-1px);
    }

    .dock-item.active .dock-label {
      color: #ffffff;
      font-weight: 800;
    }

    .dock-ping-dot {
      position: absolute;
      top: -2px;
      right: -4px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--accent-lime, #d4ff00);
      animation: ping 1.5s infinite;
    }

    .copilot-dock-item {
      color: #a1a1aa;
    }

    .copilot-orb-wrapper {
      position: relative;
    }

    .copilot-label {
      background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    @media (max-width: 860px) {
      .nav-links { display: none; }
      .mobile-bottom-dock { display: block; }
    }
  `]
})
export class NavbarComponent {
  @Input() activeTab: NavigationTab = 'today';
  @Output() tabChange = new EventEmitter<NavigationTab>();
  @Output() openAiModal = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  navTabs: { id: NavigationTab; label: string; dot?: boolean }[] = [
    { id: 'today',       label: 'HOY' },
    { id: 'weekly',      label: 'HORARIO' },
    { id: 'courses',     label: 'CURSOS' },
  ];

  constructor(
    public authService: AuthService,
    public scheduleService: ScheduleService
  ) {}

  selectTab(tab: NavigationTab): void {
    this.activeTab = tab;
    this.tabChange.emit(tab);
  }
}
