import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#070709] text-neutral-200 selection:bg-[var(--accent-lime)] selection:text-black font-sans flex flex-col justify-between">
      
      <!-- Luces de Fondo Volumétricas Sutiles -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[44rem] h-[22rem] bg-[var(--accent-lime)]/[0.04] rounded-full blur-[140px]"></div>
        <div class="absolute top-1/3 -right-40 w-[28rem] h-[28rem] bg-blue-500/[0.03] rounded-full blur-[160px]"></div>
        <div class="absolute -bottom-40 left-10 w-[30rem] h-[30rem] bg-[var(--accent-lime)]/[0.04] rounded-full blur-[140px]"></div>
      </div>

      <!-- Top Navbar Global -->
      <header class="sticky top-0 z-40 w-full px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-4 bg-gradient-to-b from-black/60 via-black/20 to-transparent backdrop-blur-md border-none select-none shrink-0">
        <button 
          (click)="goBack.emit()"
          class="inline-flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition group uppercase tracking-wider bg-transparent border-none cursor-pointer"
        >
          <svg class="h-4 w-4 group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          <span>Volver al inicio</span>
        </button>

        <div class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--accent-lime)] animate-pulse"></span>
          <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Seguridad & Privacidad
          </span>
        </div>
      </header>

      <!-- Contenido Principal Minimalista -->
      <main class="relative z-10 max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 flex-1 w-full space-y-10 text-left">
        
        <!-- Cabecera Editorial -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-[var(--accent-lime)] text-xs font-bold uppercase tracking-wider">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Transparencia y Seguridad</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase leading-tight">
            Políticas de Privacidad & Seguridad
          </h1>

          <p class="text-sm sm:text-base text-neutral-400 leading-relaxed max-w-2xl">
            Detalles técnicos sobre el tratamiento de credenciales, arquitectura Zero-Knowledge y el funcionamiento de la autenticación directa con los servidores de la UTP.
          </p>
        </div>

        <!-- Principio Fundamental -->
        <div class="p-5 sm:p-6 rounded-2xl bg-[var(--accent-lime)]/[0.04] border border-[var(--accent-lime)]/20 space-y-2">
          <div class="flex items-center gap-2.5 text-white font-bold text-sm sm:text-base">
            <svg class="h-5 w-5 text-[var(--accent-lime)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <path d="m9 11 3 3L22 4"/>
            </svg>
            <span>Garantía Fundamental: Cero Almacenamiento de Contraseñas</span>
          </div>
          <p class="text-xs sm:text-sm text-neutral-300 leading-relaxed pl-7.5">
            Esta plataforma <strong>nunca almacena, registra ni persiste tu contraseña institucional</strong> en ninguna base de datos, archivo ni servidor intermedio. Tus credenciales viajan de forma cifrada mediante HTTPS/TLS 1.3 exclusivamente hacia el proveedor oficial de identidad de la universidad.
          </p>
        </div>

        <!-- Secciones Estructuradas -->
        <div class="space-y-8 divide-y divide-white/[0.06]">
          
          <!-- Sección 01 -->
          <section class="pt-8 first:pt-0 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-[var(--accent-lime)] tracking-wider">01</span>
              <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
                Mecanismo de Autenticación Oficial (UTP SSO)
              </h2>
            </div>
            
            <p class="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              El proceso de validación se realiza en tiempo real contra el servidor central de identidad Keycloak de la universidad (<code class="text-white/90 bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">sso.utp.edu.pe</code>).
            </p>

            <ul class="space-y-2 text-xs sm:text-sm text-neutral-300 pl-4 list-disc list-outside marker:text-[var(--accent-lime)]">
              <li>
                <strong>Cifrado TLS 1.3:</strong> La transmisión de datos se realiza a través de un canal seguro HTTPS de extremo a extremo.
              </li>
              <li>
                <strong>Tokens JWT Efímeros:</strong> Tras una autenticación exitosa, la universidad emite un token de acceso temporal (Bearer JWT) con tiempo de vida limitado. La contraseña se descarta de la memoria de inmediato.
              </li>
            </ul>
          </section>

          <!-- Sección 02 -->
          <section class="pt-8 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-[var(--accent-lime)] tracking-wider">02</span>
              <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
                Datos Sincronizados y su Finalidad
              </h2>
            </div>

            <p class="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Para estructurar tu horario, asignaturas y facilitarte el contacto con compañeros de tu misma carrera, se sincronizan exclusivamente los siguientes datos académicos públicos:
            </p>

            <ul class="space-y-2 text-xs sm:text-sm text-neutral-300 pl-4 list-disc list-outside marker:text-[var(--accent-lime)]">
              <li><strong>Código de Alumno</strong> (ej. U12345678) y Nombre completo.</li>
              <li><strong>Correo Institucional</strong> asignado por la universidad.</li>
              <li><strong>Carrera y Campus</strong> asignado para contextualizar recursos y grupos.</li>
              <li><strong>Horarios y Docentes</strong> inscritos en el periodo académico vigente.</li>
            </ul>
          </section>

          <!-- Sección 03 -->
          <section class="pt-8 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-[var(--accent-lime)] tracking-wider">03</span>
              <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
                Cifrado Local y Purga de Sesión
              </h2>
            </div>

            <p class="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              La sesión en tu navegador se mantiene de forma local en <code class="text-white/90 bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">localStorage</code>. Al presionar <strong>&quot;Cerrar Sesión&quot;</strong>, todos los tokens de acceso y registros temporales son purgados de forma irreversible e inmediata de tu dispositivo.
            </p>
          </section>

          <!-- Sección 04 -->
          <section class="pt-8 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-[var(--accent-lime)] tracking-wider">04</span>
              <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
                Cuota Responsable del Copiloto Académico IA
              </h2>
            </div>

            <p class="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Con el objetivo de garantizar la disponibilidad equitativa de los modelos de inteligencia artificial para toda la comunidad estudiantil, se asigna una cuota diaria de consultas por estudiante que se renueva automáticamente a las 00:00 horas.
            </p>
          </section>

          <!-- Sección 05 -->
          <section class="pt-8 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-[var(--accent-lime)] tracking-wider">05</span>
              <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
                Declaración de Independencia y Propiedad Intelectual
              </h2>
            </div>

            <p class="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Esta plataforma es una herramienta tecnológica independiente desarrollada por y para estudiantes. No constituye un servicio oficial operado ni administrado directamente por la administración de la Universidad Tecnológica del Perú (UTP). Todos los nombres de marcas e instituciones pertenecen a sus respectivos titulares.
            </p>
          </section>

        </div>

        <!-- Botón de Retorno -->
        <div class="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            (click)="goBack.emit()"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--accent-lime)] hover:bg-[#a8e63b] text-[#0a0a0c] font-bold text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-[var(--accent-lime)]/20 border-none cursor-pointer"
          >
            <span>Volver a la Plataforma</span>
            <svg class="h-4 w-4 text-[#0a0a0c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </button>

          <span class="text-xs text-neutral-500">
            Última actualización: Septiembre 2026
          </span>
        </div>

      </main>

      <!-- Footer Global Transparente -->
      <footer class="relative z-10 w-full px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-3 text-xs text-neutral-500 bg-gradient-to-t from-black/60 via-black/20 to-transparent backdrop-blur-md border-none shrink-0">
        <div class="text-xs">
          © 2026 UTP.HORARIO / Políticas de Seguridad
        </div>
        <div class="text-xs font-medium uppercase tracking-wider text-neutral-500">
          HECHO PARA ESTUDIANTES
        </div>
      </footer>

    </div>
  `
})
export class PrivacyPageComponent {
  @Output() goBack = new EventEmitter<void>();
}
