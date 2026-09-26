import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class UiFeedbackService {
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', durationMs = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, message };
    this.toastsSignal.update((list) => [...list, toast]);

    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  success(titleOrMessage: string, detail?: string): void {
    const text = detail ? `${titleOrMessage}: ${detail}` : titleOrMessage;
    this.show(text, 'success');
  }

  error(titleOrMessage: string, detail?: string): void {
    const text = detail ? `${titleOrMessage}: ${detail}` : titleOrMessage;
    this.show(text, 'error');
  }

  info(titleOrMessage: string, detail?: string): void {
    const text = detail ? `${titleOrMessage}: ${detail}` : titleOrMessage;
    this.show(text, 'info');
  }

  dismiss(id: string): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }
}
