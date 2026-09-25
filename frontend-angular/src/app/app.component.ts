import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';
import { NavbarComponent, NavigationTab } from './features/navbar/navbar.component';
import { TodayViewComponent } from './features/today/today-view.component';
import { WeeklyScheduleComponent } from './features/schedule/weekly-schedule.component';
import { SyllabusViewComponent } from './features/syllabus/syllabus-view.component';
import { NetworkingViewComponent } from './features/networking/networking-view.component';
import { CommunityViewComponent } from './features/community/community-view.component';
import { MarketplaceViewComponent } from './features/marketplace/marketplace-view.component';
import { SettingsModalComponent } from './features/settings/settings-modal.component';
import { AiAssistantModalComponent } from './features/ai-assistant/ai-assistant-modal.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { PrivacyPageComponent } from './features/privacy/privacy-page.component';

import { SyllabusService } from '@data/services/syllabus.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    TodayViewComponent,
    WeeklyScheduleComponent,
    SyllabusViewComponent,
    NetworkingViewComponent,
    CommunityViewComponent,
    MarketplaceViewComponent,
    SettingsModalComponent,
    AiAssistantModalComponent,
    LoginPageComponent,
    PrivacyPageComponent
  ],
  template: `
    @if (showPrivacy) {
      <app-privacy-page (goBack)="showPrivacy = false"></app-privacy-page>
    } @else if (!authService.isAuthenticated()) {
      <app-login-page (openPrivacy)="showPrivacy = true"></app-login-page>
    } @else {
      <div class="min-h-screen bg-[#070709] text-white flex flex-col font-sans selection:bg-[var(--accent-lime)] selection:text-black">
        <app-navbar 
          [activeTab]="activeTab"
          (tabChange)="activeTab = $event" 
          (openAiModal)="isAiModalOpen = true"
          (openSettings)="isSettingsModalOpen = true">
        </app-navbar>

        <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          @if (activeTab === 'today') {
            <app-today-view (askAi)="openAiWithPrompt($event)"></app-today-view>
          } @else if (activeTab === 'weekly') {
            <app-weekly-schedule 
              (openAi)="openAiWithPrompt($event)"
              (openSyllabus)="activeTab = 'courses'">
            </app-weekly-schedule>
          } @else if (activeTab === 'courses') {
            <app-syllabus-view (askAi)="openAiWithPrompt($event)"></app-syllabus-view>
          } @else if (activeTab === 'networking') {
            <app-networking-view></app-networking-view>
          } @else if (activeTab === 'community') {
            <app-community-view (askAi)="openAiWithPrompt($event)"></app-community-view>
          } @else if (activeTab === 'marketplace') {
            <app-marketplace-view></app-marketplace-view>
          }
        </main>

        <app-ai-assistant-modal 
          [isOpen]="isAiModalOpen" 
          [interval]="scheduleService.currentSchedule()"
          [initialPrompt]="aiPrompt"
          (close)="isAiModalOpen = false; aiPrompt = ''">
        </app-ai-assistant-modal>

        <app-settings-modal
          [isOpen]="isSettingsModalOpen"
          (close)="isSettingsModalOpen = false">
        </app-settings-modal>
      </div>
    }
  `
})
export class AppComponent implements OnInit {
  showPrivacy = false;
  activeTab: NavigationTab = 'today';
  isAiModalOpen = false;
  isSettingsModalOpen = false;
  aiPrompt = '';

  constructor(
    public authService: AuthService,
    public scheduleService: ScheduleService,
    private syllabusService: SyllabusService
  ) {}

  ngOnInit(): void {
    // Cargar y verificar horario del estudiante autenticado
    if (this.authService.isAuthenticated()) {
      this.scheduleService.getSchedule().subscribe();
    }
  }

  openAiWithPrompt(prompt: string): void {
    this.aiPrompt = prompt;
    this.isAiModalOpen = true;
  }
}

