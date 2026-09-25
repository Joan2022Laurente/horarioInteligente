import { Injectable, computed, signal, inject } from '@angular/core';
import { ScheduleService } from '@data/services/schedule.service';
import { UTPEvent } from '@domain/models/utp.model';
import { getCurrentAndNextClass, getEventsForDay } from '@data/schedule-parser';
import { getCachedCalendarData } from '@data/syllabus/client-storage';

@Injectable({
  providedIn: 'root'
})
export class TodayStore {
  private readonly scheduleService = inject(ScheduleService);

  readonly selectedDate = signal<Date>(new Date());
  readonly now = signal<Date>(new Date());
  private timerId: any = null;

  constructor() {
    this.startClock();
  }

  private startClock(): void {
    if (typeof window !== 'undefined') {
      this.timerId = setInterval(() => {
        this.now.set(new Date());
      }, 1000);
    }
  }

  readonly events = computed(() => {
    const serviceEvents = this.scheduleService.calendarData()?.current_interval?.events;
    if (serviceEvents && serviceEvents.length > 0) return serviceEvents;
    const cached = getCachedCalendarData();
    return cached?.data?.current_interval?.events || [];
  });
  readonly loading = this.scheduleService.loading;

  readonly eventsForToday = computed(() => {
    return getEventsForDay(this.events(), this.selectedDate());
  });

  readonly classStatus = computed(() => {
    return getCurrentAndNextClass(this.events(), this.now());
  });

  readonly currentClass = computed(() => this.classStatus().currentClass);
  readonly nextClass = computed(() => this.classStatus().nextClass);
  readonly minutesToNext = computed(() => this.classStatus().minutesToNext);
  readonly minutesRemainingCurrent = computed(() => this.classStatus().minutesRemainingCurrent);

  setSelectedDate(date: Date): void {
    this.selectedDate.set(date);
  }

  setToday(): void {
    this.selectedDate.set(new Date());
  }

  destroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }
}
