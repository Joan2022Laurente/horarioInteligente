import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule, icons } from 'lucide-angular';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { httpTraceInterceptor } from './app/core/interceptors/http-trace.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withFetch(),
      // Orden: la trazabilidad envuelve la autenticación para medir la latencia
      // completa de cada consulta, header Bearer incluido.
      withInterceptors([httpTraceInterceptor, authInterceptor])
    ),
    importProvidersFrom(LucideAngularModule.pick(icons))
  ]
}).catch(err => console.error(err));
