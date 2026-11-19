import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@data/services/auth.service';
import { getCachedStudentProfile } from '@data/syllabus/client-storage';

type TabId = 'chatgpt' | 'claude' | 'gemini' | 'tools';

interface McpTool {
  name: string;
  description: string;
}

const SSE_PATH = '/api/v1/mcp/sse';
const INFO_PATH = '/api/v1/mcp/info';

const TOOLS: readonly McpTool[] = [
  { name: 'get_today_schedule', description: 'Horario, aulas y docentes de tus clases de hoy.' },
  { name: 'get_enrolled_courses', description: 'Catálogo de asignaturas matriculadas con sus códigos.' },
  { name: 'get_syllabus_details', description: 'Sílabo oficial: temas semanales, fórmulas y porcentajes.' },
  { name: 'get_upcoming_evaluations', description: 'Próximas evaluaciones: PC, APF, exámenes y semanas.' },
  { name: 'get_remaining_classes_today', description: 'Clases restantes de hoy enriquecidas con temas del sílabo.' },
  { name: 'get_course_tasks_and_activities', description: 'Tareas y actividades de Canvas correlacionadas al sílabo.' },
  { name: 'search_marketplace', description: 'Tutorías 1 a 1 y recursos académicos entre compañeros.' },
];

const PROMPTS: readonly string[] = [
  '¿Qué aula me toca en mi siguiente clase de hoy?',
  '¿Cuáles son los temas de la semana 15 de Desarrollo Web según el sílabo?',
  '¿Qué evaluaciones tengo programadas para las próximas 2 semanas?',
];

@Component({
  selector: 'app-mcp-guide-modal',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- McpGuideModal · Angular 18 · Tailwind + variables :root -->
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/80"
      (click)="closed.emit()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcp-modal-title"
    >
      <div
        class="relative w-full max-w-[620px] max-h-[92vh] flex flex-col overflow-hidden font-sans
               bg-[var(--bg-main)] border border-[var(--border-medium)]
               rounded-[var(--r-overlay)] shadow-2xl shadow-black/60"
        (click)="$event.stopPropagation()"
      >

        <!-- ============ CABECERA ============ -->
        <header class="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-[var(--border-subtle)]">
          <div
            class="shrink-0 w-11 h-11 flex items-center justify-center
                   bg-[var(--surface-subtle)] border border-[var(--border-subtle)]
                   rounded-[var(--r-control-md)]"
          >
            <lucide-icon name="globe" class="w-5 h-5 text-[var(--accent-lime)]"></lucide-icon>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="mcp-modal-title" class="text-[17px] font-semibold tracking-tight text-white">
                Conectar a tus IAs Web
              </h2>
              <span
                class="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider
                       text-[var(--utopik-sandy-brown)] bg-[var(--surface-subtle)]
                       border border-[var(--border-subtle)] rounded-full"
              >
                GPTs · Claude · Gemini
              </span>
            </div>
            <p class="mt-1.5 text-[13px] leading-relaxed text-white/50">
              Usa tu horario, sílabos y tareas oficiales en las versiones web de tus asistentes
            </p>
          </div>

          <button
            type="button"
            (click)="closed.emit()"
            aria-label="Cerrar"
            class="shrink-0 w-8 h-8 flex items-center justify-center text-white/40
                   hover:text-white hover:bg-[var(--surface-subtle)] transition-colors
                   rounded-[var(--r-control-sm)]"
          >
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </header>

        <!-- ============ CUERPO CON SCROLL ============ -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- ---------- CREDENCIALES ---------- -->
          <section
            class="p-4 space-y-3 bg-[var(--surface-card)] border border-[var(--border-subtle)]
                   rounded-[var(--r-card)]"
          >
            <!-- URL -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-medium uppercase tracking-wider text-white/40">
                URL de conexión web
              </label>
              <div class="flex items-stretch gap-2">
                <div
                  class="flex-1 min-w-0 flex items-center px-3 py-2.5 bg-[var(--surface-input)]
                         border border-[var(--border-subtle)] rounded-[var(--r-control-sm)]"
                >
                  <span class="font-mono text-[12px] text-white/80 truncate select-all">{{ infoUrl }}</span>
                </div>
                <button
                  type="button"
                  (click)="copy('info-url', infoUrl)"
                  class="shrink-0 inline-flex items-center gap-1.5 px-3.5 text-[12px] font-medium
                         border transition-colors rounded-[var(--r-control-sm)]"
                  [class]="copiedKey() === 'info-url'
                    ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)]'
                    : 'bg-[var(--surface-subtle)] text-white/80 border-[var(--border-medium)] hover:text-white hover:border-white/30'"
                >
                  <lucide-icon [name]="copiedKey() === 'info-url' ? 'check' : 'copy'" class="w-3.5 h-3.5"></lucide-icon>
                  {{ copiedKey() === 'info-url' ? 'Copiado' : 'Copiar URL' }}
                </button>
              </div>
            </div>

            <!-- TOKEN -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Token de sesión
              </label>
              <div class="flex items-stretch gap-2">
                <div
                  class="flex-1 min-w-0 flex items-center px-3 py-2.5 bg-[var(--surface-input)]
                         border border-[var(--border-subtle)] rounded-[var(--r-control-sm)]"
                >
                  <span class="font-mono text-[12px] text-white/80 truncate">{{ maskedToken() }}</span>
                </div>
                <button
                  type="button"
                  [disabled]="!token()"
                  (click)="copy('token', token())"
                  class="shrink-0 inline-flex items-center gap-1.5 px-3.5 text-[12px] font-medium
                         border transition-colors rounded-[var(--r-control-sm)] disabled:opacity-40"
                  [class]="copiedKey() === 'token'
                    ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)]'
                    : 'bg-[var(--surface-subtle)] text-white/80 border-[var(--border-medium)] hover:text-white hover:border-white/30'"
                >
                  <lucide-icon [name]="copiedKey() === 'token' ? 'check' : 'copy'" class="w-3.5 h-3.5"></lucide-icon>
                  {{ copiedKey() === 'token' ? 'Copiado' : 'Copiar Token' }}
                </button>
              </div>
            </div>

            <p class="flex items-center gap-1.5 pt-0.5 text-[11px] text-white/40">
              <lucide-icon name="shield" class="w-3.5 h-3.5 text-[var(--accent-lime)]"></lucide-icon>
              Autenticación personal UTP de un solo paso
            </p>
          </section>

          <!-- ---------- PESTAÑAS ---------- -->
          <nav
            class="grid grid-cols-4 gap-1 p-1 bg-[var(--surface-card)] border border-[var(--border-subtle)]
                   rounded-[var(--r-control-md)]"
            role="tablist"
          >
            <button
              type="button" role="tab"
              [attr.aria-selected]="tab() === 'chatgpt'"
              (click)="tab.set('chatgpt')"
              class="flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors rounded-[var(--r-control-sm)]"
              [class]="tab() === 'chatgpt'
                ? 'bg-[var(--surface-subtle)] text-[var(--accent-lime)] border border-[var(--border-medium)]'
                : 'text-white/45 border border-transparent hover:text-white/80'"
            >
              <lucide-icon name="bot" class="w-3.5 h-3.5"></lucide-icon>
              <span>ChatGPT</span>
            </button>

            <button
              type="button" role="tab"
              [attr.aria-selected]="tab() === 'claude'"
              (click)="tab.set('claude')"
              class="flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors rounded-[var(--r-control-sm)]"
              [class]="tab() === 'claude'
                ? 'bg-[var(--surface-subtle)] text-[var(--accent-lime)] border border-[var(--border-medium)]'
                : 'text-white/45 border border-transparent hover:text-white/80'"
            >
              <lucide-icon name="sparkles" class="w-3.5 h-3.5"></lucide-icon>
              <span>Claude</span>
            </button>

            <button
              type="button" role="tab"
              [attr.aria-selected]="tab() === 'gemini'"
              (click)="tab.set('gemini')"
              class="flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors rounded-[var(--r-control-sm)]"
              [class]="tab() === 'gemini'
                ? 'bg-[var(--surface-subtle)] text-[var(--accent-lime)] border border-[var(--border-medium)]'
                : 'text-white/45 border border-transparent hover:text-white/80'"
            >
              <lucide-icon name="globe" class="w-3.5 h-3.5"></lucide-icon>
              <span>Gemini</span>
            </button>

            <button
              type="button" role="tab"
              [attr.aria-selected]="tab() === 'tools'"
              (click)="tab.set('tools')"
              class="flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors rounded-[var(--r-control-sm)]"
              [class]="tab() === 'tools'
                ? 'bg-[var(--surface-subtle)] text-[var(--accent-lime)] border border-[var(--border-medium)]'
                : 'text-white/45 border border-transparent hover:text-white/80'"
            >
              <lucide-icon name="plug" class="w-3.5 h-3.5"></lucide-icon>
              <span>Herramientas</span>
            </button>
          </nav>

          <!-- ---------- CONTENIDO DE PESTAÑAS ---------- -->
          <section class="min-h-[250px]">
            @switch (tab()) {

              <!-- ===== CHATGPT ===== -->
              @case ('chatgpt') {
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-[14px] font-semibold text-white">ChatGPT Web</h3>
                      <p class="font-mono text-[11px] text-white/35">chatgpt.com</p>
                    </div>
                    <span class="text-[10px] font-medium uppercase tracking-wider text-[var(--utopik-sandy-brown)]">
                      Recomendado
                    </span>
                  </div>

                  <ol class="space-y-2.5">
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">1</span>
                      <p class="text-[13px] leading-relaxed text-white/70">
                        Ve a <strong class="font-medium text-white">Mis GPTs</strong> &gt;
                        <strong class="font-medium text-white">Crear un GPT</strong> &gt; pestaña
                        <strong class="font-medium text-white">Configurar</strong>.
                      </p>
                    </li>
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">2</span>
                      <p class="text-[13px] leading-relaxed text-white/70">
                        Al fondo, clic en <strong class="font-medium text-white">Crear nueva acción</strong> &gt;
                        <strong class="font-medium text-white">Importar desde URL</strong> y pega la URL de conexión web.
                      </p>
                    </li>
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">3</span>
                      <p class="text-[13px] leading-relaxed text-white/70">
                        En <strong class="font-medium text-white">Autenticación</strong>, elige
                        <strong class="font-medium text-white">API Key (Bearer)</strong> y pega tu Token de sesión.
                      </p>
                    </li>
                  </ol>

                  <a
                    href="https://chatgpt.com/gpts/editor"
                    target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-black
                           bg-[var(--accent-lime)] hover:brightness-95 transition rounded-[var(--r-control-sm)]"
                  >
                    Abrir editor de GPTs
                    <lucide-icon name="external-link" class="w-3.5 h-3.5"></lucide-icon>
                  </a>
                </div>
              }

              <!-- ===== CLAUDE ===== -->
              @case ('claude') {
                <div class="space-y-4">
                  <div>
                    <h3 class="text-[14px] font-semibold text-white">Claude Web</h3>
                    <p class="font-mono text-[11px] text-white/35">claude.ai</p>
                  </div>

                  <ol class="space-y-2.5">
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">1</span>
                      <p class="text-[13px] leading-relaxed text-white/70">
                        En <strong class="font-medium text-white">claude.ai</strong> abre
                        <strong class="font-medium text-white">Configuración</strong> &gt;
                        <strong class="font-medium text-white">Conectores</strong>.
                      </p>
                    </li>
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">2</span>
                      <div class="min-w-0 flex-1 space-y-2">
                        <p class="text-[13px] leading-relaxed text-white/70">
                          Elige <strong class="font-medium text-white">Añadir conector personalizado</strong> y pega esta URL:
                        </p>
                        <div class="flex items-stretch gap-2">
                          <div class="flex-1 min-w-0 flex items-center px-3 py-2 bg-[var(--surface-input)] border border-[var(--border-subtle)] rounded-[var(--r-control-sm)]">
                            <span class="font-mono text-[11px] text-white/80 truncate select-all">{{ sseUrl }}</span>
                          </div>
                          <button
                            type="button"
                            (click)="copy('sse-url', sseUrl)"
                            class="shrink-0 inline-flex items-center gap-1.5 px-3 text-[11px] font-medium border transition-colors rounded-[var(--r-control-sm)]"
                            [class]="copiedKey() === 'sse-url'
                              ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)]'
                              : 'bg-[var(--surface-subtle)] text-white/80 border-[var(--border-medium)] hover:text-white'"
                          >
                            <lucide-icon [name]="copiedKey() === 'sse-url' ? 'check' : 'copy'" class="w-3.5 h-3.5"></lucide-icon>
                            {{ copiedKey() === 'sse-url' ? 'Copiado' : 'Copiar' }}
                          </button>
                        </div>
                      </div>
                    </li>
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">3</span>
                      <p class="text-[13px] leading-relaxed text-white/70">
                        Autoriza con tu Token cuando te lo pida y activa el conector en tus chats o en un
                        <strong class="font-medium text-white">Proyecto</strong>.
                      </p>
                    </li>
                  </ol>

                  <a
                    href="https://claude.ai/settings/connectors"
                    target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-black
                           bg-[var(--accent-lime)] hover:brightness-95 transition rounded-[var(--r-control-sm)]"
                  >
                    Abrir conectores de Claude
                    <lucide-icon name="external-link" class="w-3.5 h-3.5"></lucide-icon>
                  </a>

                  <p class="text-[11px] leading-relaxed text-white/35">
                    La disponibilidad de conectores personalizados depende de tu plan de Claude.
                  </p>
                </div>
              }

              <!-- ===== GEMINI ===== -->
              @case ('gemini') {
                <div class="space-y-4">
                  <div>
                    <h3 class="text-[14px] font-semibold text-white">Gemini Web</h3>
                    <p class="font-mono text-[11px] text-white/35">gemini.google.com</p>
                  </div>

                  <ol class="space-y-2.5">
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">1</span>
                      <p class="text-[13px] leading-relaxed text-white/70">
                        Entra a <strong class="font-medium text-white">gemini.google.com</strong> &gt;
                        <strong class="font-medium text-white">Gems</strong> &gt;
                        <strong class="font-medium text-white">Nuevo Gem</strong>.
                      </p>
                    </li>
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">2</span>
                      <div class="min-w-0 flex-1 space-y-2">
                        <p class="text-[13px] leading-relaxed text-white/70">
                          Copia la URL de conexión y pégala en las instrucciones del Gem para que consulte tus datos.
                        </p>
                        <button
                          type="button"
                          (click)="copy('gemini-url', infoUrl)"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border transition-colors rounded-[var(--r-control-sm)]"
                          [class]="copiedKey() === 'gemini-url'
                            ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)]'
                            : 'bg-[var(--surface-subtle)] text-white/80 border-[var(--border-medium)] hover:text-white'"
                        >
                          <lucide-icon [name]="copiedKey() === 'gemini-url' ? 'check' : 'copy'" class="w-3.5 h-3.5"></lucide-icon>
                          {{ copiedKey() === 'gemini-url' ? 'Copiado' : 'Copiar URL' }}
                        </button>
                      </div>
                    </li>
                    <li class="flex gap-3.5 p-3.5 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                      <span class="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-[11px] text-[var(--accent-lime)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] rounded-full">3</span>
                      <p class="text-[13px] leading-relaxed text-white/70">
                        Guarda el Gem y pruébalo con una de las preguntas de la pestaña
                        <strong class="font-medium text-white">Herramientas</strong>.
                      </p>
                    </li>
                  </ol>

                  <a
                    href="https://gemini.google.com/gems/create"
                    target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-black
                           bg-[var(--accent-lime)] hover:brightness-95 transition rounded-[var(--r-control-sm)]"
                  >
                    Crear un Gem
                    <lucide-icon name="external-link" class="w-3.5 h-3.5"></lucide-icon>
                  </a>

                  <p class="text-[11px] leading-relaxed text-white/35">
                    Gemini Web aún ofrece soporte limitado para conexiones externas; las funciones pueden variar según tu cuenta.
                  </p>
                </div>
              }

              <!-- ===== HERRAMIENTAS Y PROMPTS ===== -->
              @case ('tools') {
                <div class="space-y-5">
                  <div class="space-y-2.5">
                    <h3 class="text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Herramientas disponibles
                    </h3>
                    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      @for (t of tools; track t.name) {
                        <li class="flex items-start gap-2.5 p-3 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--r-control-md)]">
                          <lucide-icon name="plug" class="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--accent-lime)]"></lucide-icon>
                          <div class="min-w-0">
                            <p class="font-mono text-[11.5px] text-white truncate">{{ t.name }}</p>
                            <p class="mt-0.5 text-[11.5px] leading-snug text-white/45">{{ t.description }}</p>
                          </div>
                        </li>
                      }
                    </ul>
                  </div>

                  <div class="space-y-2.5">
                    <h3 class="text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Prueba preguntando
                    </h3>
                    <div class="flex flex-wrap gap-2">
                      @for (p of prompts; track $index) {
                        <button
                          type="button"
                          (click)="copy('prompt-' + $index, p)"
                          class="group inline-flex items-center gap-2 px-3 py-2 text-left text-[12px] border transition-colors rounded-full"
                          [class]="copiedKey() === 'prompt-' + $index
                            ? 'bg-[var(--surface-subtle)] text-[var(--accent-lime)] border-[var(--accent-lime)]/50'
                            : 'bg-[var(--surface-card)] text-white/65 border-[var(--border-subtle)] hover:text-white hover:border-[var(--border-medium)]'"
                        >
                          <span>{{ p }}</span>
                          <lucide-icon
                            [name]="copiedKey() === 'prompt-' + $index ? 'check' : 'copy'"
                            class="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100"
                          ></lucide-icon>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }

            }
          </section>
        </div>

        <!-- ============ PIE: ACCESO SECUNDARIO ============ -->
        <footer class="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <details class="group">
            <summary
              class="flex items-center justify-between gap-3 cursor-pointer list-none text-[12px]
                     text-white/40 hover:text-white/70 transition-colors [&::-webkit-details-marker]:hidden"
            >
              <span>¿Eres programador? Ver configuración para Claude Desktop o Cursor (npx / IDE)</span>
              <lucide-icon name="plug" class="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-90"></lucide-icon>
            </summary>

            <div class="mt-3 space-y-2">
              <p class="text-[11.5px] leading-relaxed text-white/45">
                Para clientes locales, usa el servidor SSE con el mismo token de sesión.
              </p>
              <div class="flex items-stretch gap-2">
                <div class="flex-1 min-w-0 flex items-center px-3 py-2 bg-[var(--surface-input)] border border-[var(--border-subtle)] rounded-[var(--r-control-sm)]">
                  <span class="font-mono text-[11px] text-white/70 truncate select-all">{{ sseUrl }}</span>
                </div>
                <button
                  type="button"
                  (click)="copy('dev-sse', sseUrl)"
                  class="shrink-0 inline-flex items-center gap-1.5 px-3 text-[11px] font-medium border transition-colors rounded-[var(--r-control-sm)]"
                  [class]="copiedKey() === 'dev-sse'
                    ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)]'
                    : 'bg-[var(--surface-subtle)] text-white/80 border-[var(--border-medium)] hover:text-white'"
                >
                  <lucide-icon [name]="copiedKey() === 'dev-sse' ? 'check' : 'copy'" class="w-3.5 h-3.5"></lucide-icon>
                  {{ copiedKey() === 'dev-sse' ? 'Copiado' : 'Copiar SSE' }}
                </button>
              </div>
            </div>
          </details>
        </footer>

      </div>
    </div>
  `
})
export class McpGuideModalComponent {
  readonly closed = output<void>();

  private readonly auth = inject(AuthService);

  readonly tools = TOOLS;
  readonly prompts = PROMPTS;

  readonly sseUrl = window.location.origin + SSE_PATH;
  readonly infoUrl = window.location.origin + INFO_PATH;

  readonly tab = signal<TabId>('chatgpt');
  readonly copiedKey = signal<string | null>(null);

  /** Token seguro: reactivo a la sesión activa en AuthService o almacenamiento local */
  readonly token = computed(() => {
    return this.auth.currentStudent()?.token || getCachedStudentProfile()?.token || '';
  });

  readonly maskedToken = computed(() => {
    const t = this.token();
    if (!t) return 'Sin sesión activa (inicia sesión de nuevo)';
    return t.length > 12 ? `${t.slice(0, 4)}...${t.slice(-4)}` : '••••••••';
  });

  private copyTimer?: ReturnType<typeof setTimeout>;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  async copy(key: string, value: string | null | undefined): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.copiedKey.set(key);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copiedKey.set(null), 1800);
    } catch {
      this.copiedKey.set(null);
    }
  }
}
