import { NgTemplateOutlet } from '@angular/common';
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

type TabId = 'claude' | 'chatgpt' | 'ides' | 'tools';

interface McpTool {
  name: string;
  description: string;
}

const MCP_PROTOCOL = '2024-11-05';
const SSE_PATH = '/api/v1/mcp/sse';
const INFO_PATH = '/api/v1/mcp/info';
const SERVER_NAME = 'utp-horario';

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
  imports: [LucideAngularModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-title"
        (click)="$event.stopPropagation()"
      >
        <!-- Cabecera -->
        <header class="head">
          <div class="head-icon" aria-hidden="true">
            <lucide-icon name="plug" class="h-5 w-5 text-[var(--accent-lime)]"></lucide-icon>
          </div>
          <div class="head-text">
            <div class="head-title-row">
              <h2 id="mcp-title">Servidor MCP Académico</h2>
              <span class="badge font-mono">Protocolo v{{ protocol }}</span>
            </div>
            <p>Conecta tu horario, sílabos y tareas en tiempo real a tus IAs favoritas</p>
          </div>
          <button type="button" class="icon-btn" aria-label="Cerrar" (click)="closed.emit()">
            <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
          </button>
        </header>

        <div class="body">
          <!-- Credenciales en vivo -->
          <div class="creds">
            <div class="cred-row">
              <div class="cred-label">URL del servidor SSE</div>
              <div class="cred-line">
                <code class="mono field">{{ sseUrl }}</code>
                <button type="button" class="btn" (click)="copy('url', sseUrl)">
                  <lucide-icon [name]="copiedKey() === 'url' ? 'check' : 'copy'" class="h-3.5 w-3.5"></lucide-icon>
                  {{ copiedKey() === 'url' ? 'Copiado' : 'Copiar URL' }}
                </button>
              </div>
            </div>

            <div class="cred-row">
              <div class="cred-label">
                Token de sesión UTP
                @if (token()) {
                  <span class="status status-on"><i></i>Activo</span>
                } @else {
                  <span class="status status-off"><i></i>Sin sesión</span>
                }
              </div>
              <div class="cred-line">
                <code class="mono field">{{ maskedToken() }}</code>
                <button
                  type="button"
                  class="btn"
                  [disabled]="!token()"
                  (click)="copy('token', token()!)"
                >
                  <lucide-icon [name]="copiedKey() === 'token' ? 'check' : 'copy'" class="h-3.5 w-3.5"></lucide-icon>
                  {{ copiedKey() === 'token' ? 'Copiado' : 'Copiar Token Bearer' }}
                </button>
              </div>
            </div>

            <p class="note">
              <lucide-icon name="shield" class="h-3.5 w-3.5"></lucide-icon>
              El token es personal y otorga acceso exclusivo a tu cuenta académica
            </p>
          </div>

          <!-- Pestañas -->
          <div class="tabs" role="tablist" aria-label="Plataformas">
            @for (t of tabs; track t.id) {
              <button
                type="button"
                role="tab"
                class="tab"
                [class.active]="tab() === t.id"
                [attr.aria-selected]="tab() === t.id"
                (click)="tab.set(t.id)"
              >
                {{ t.label }}
              </button>
            }
          </div>

          <div class="tab-panel" role="tabpanel">
            @switch (tab()) {
              @case ('claude') {
                <ol class="steps">
                  <li>
                    Abre tu archivo de configuración de Claude Desktop:
                    <code class="mono inline">%APPDATA%/Claude/claude_desktop_config.json</code>
                    <span class="muted">(macOS: ~/Library/Application Support/Claude/)</span>
                  </li>
                  <li>Pega este bloque, guarda y reinicia Claude Desktop.</li>
                </ol>
                <ng-container
                  *ngTemplateOutlet="codeBlock; context: { key: 'claude', label: 'claude_desktop_config.json', html: claudeHtml(), raw: claudeRaw() }"
                ></ng-container>
              }

              @case ('chatgpt') {
                <ol class="steps">
                  <li>En ChatGPT, crea o edita un GPT y abre la sección <strong>Actions</strong>.</li>
                  <li>
                    Elige <strong>Import from URL</strong> y usa la URL pública del esquema del servidor:
                    <code class="mono inline">{{ infoUrl }}</code>
                  </li>
                  <li>
                    En <strong>Authentication</strong> selecciona API Key, tipo Bearer, y pega tu token.
                  </li>
                </ol>
                <div class="cred-line spaced">
                  <code class="mono field">{{ infoUrl }}</code>
                  <button type="button" class="btn" (click)="copy('info', infoUrl)">
                    <lucide-icon [name]="copiedKey() === 'info' ? 'check' : 'copy'" class="h-3.5 w-3.5"></lucide-icon>
                    {{ copiedKey() === 'info' ? 'Copiado' : 'Copiar esquema' }}
                  </button>
                </div>
                <a
                  class="link"
                  href="https://help.openai.com/en/articles/8554397-creating-a-gpt"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Guía oficial de GPTs</span>
                  <lucide-icon name="external-link" class="h-3.5 w-3.5"></lucide-icon>
                </a>
              }

              @case ('ides') {
                <ol class="steps">
                  <li>
                    Crea <code class="mono inline">.cursor/mcp.json</code> en tu proyecto
                    (o en tu configuración global de Cursor).
                  </li>
                  <li>
                    Pega el bloque JSON. Windsurf y Antigravity aceptan este mismo formato de servidor SSE.
                  </li>
                </ol>
                <ng-container
                  *ngTemplateOutlet="codeBlock; context: { key: 'ide', label: '.cursor/mcp.json', html: ideHtml(), raw: ideRaw() }"
                ></ng-container>
              }

              @case ('tools') {
                <ul class="tools">
                  @for (tool of tools; track tool.name) {
                    <li>
                      <code class="mono tool-name">{{ tool.name }}</code>
                      <span>{{ tool.description }}</span>
                    </li>
                  }
                </ul>

                <p class="sub">
                  <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-[var(--accent-lime)]"></lucide-icon>
                  Prompts para probar
                </p>
                <div class="chips">
                  @for (p of prompts; track p; let i = $index) {
                    <button type="button" class="chip" (click)="copy('p' + i, p)">
                      <span>{{ p }}</span>
                      <lucide-icon [name]="copiedKey() === 'p' + i ? 'check' : 'copy'" class="h-3.5 w-3.5"></lucide-icon>
                    </button>
                  }
                </div>
              }
            }
          </div>
        </div>
      </section>
    </div>

    <ng-template #codeBlock let-key="key" let-label="label" let-html="html" let-raw="raw">
      <div class="code">
        <div class="code-bar">
          <span class="code-label mono">
            <lucide-icon name="code" class="h-3.5 w-3.5"></lucide-icon>
            {{ label }}
          </span>
          <button type="button" class="btn btn-sm" (click)="copy(key, raw)">
            <lucide-icon [name]="copiedKey() === key ? 'check' : 'copy'" class="h-3 w-3"></lucide-icon>
            {{ copiedKey() === key ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <pre class="mono" [innerHTML]="html"></pre>
      </div>
    </ng-template>
  `,
  styles: [
    `
      :host {
        --_bg-main: var(--bg-main, #0a0a0c);
        --_card: var(--surface-card, #141417);
        --_subtle: var(--surface-subtle, #1c1c22);
        --_input: var(--surface-input, #121215);
        --_lime: var(--accent-lime, #bbf451);
        --_sandy: var(--utopik-sandy-brown, #ee964b);
        --_b1: var(--border-subtle, rgba(255, 255, 255, 0.08));
        --_b2: var(--border-medium, rgba(255, 255, 255, 0.16));
        --_r-sm: var(--r-control-sm, 6px);
        --_r-md: var(--r-control-md, 8px);
        --_r-lg: var(--r-control-lg, 10px);
        --_r-card: var(--r-card, 18px);
        --_r-overlay: var(--r-overlay, 24px);
        --_text: #f2f2f4;
        --_muted: #9a9aa6;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        color: var(--_text);
      }

      .mono {
        font-family: ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
      }

      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: 16px;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      .panel {
        width: min(720px, 100%);
        max-height: min(90vh, 860px);
        display: flex;
        flex-direction: column;
        background: var(--_bg-main);
        border: 1px solid var(--_b2);
        border-radius: var(--_r-overlay);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        overflow: hidden;
      }

      .head {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 22px 24px 18px;
        border-bottom: 1px solid var(--_b1);
      }
      .head-icon {
        flex: none;
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        background: var(--_subtle);
        border: 1px solid var(--_b2);
        border-radius: var(--_r-lg);
      }
      .head-text {
        flex: 1;
        min-width: 0;
      }
      .head-title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
      }
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .head-text p {
        margin: 4px 0 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--_muted);
      }
      .badge {
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
        color: var(--_muted);
        background: var(--_subtle);
        border: 1px solid var(--_b1);
        border-radius: 999px;
      }
      .icon-btn {
        flex: none;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        color: var(--_muted);
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--_r-md);
        cursor: pointer;
        transition: color 0.15s, background 0.15s;
      }
      .icon-btn:hover {
        color: var(--_text);
        background: var(--_subtle);
      }

      .body {
        padding: 20px 24px 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .creds {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
        background: var(--_card);
        border: 1px solid var(--_b1);
        border-radius: var(--_r-card);
      }
      .cred-label {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--_muted);
      }
      .cred-line {
        display: flex;
        gap: 8px;
        align-items: stretch;
      }
      .cred-line.spaced {
        margin: 14px 0 10px;
      }
      .field {
        flex: 1;
        min-width: 0;
        padding: 9px 12px;
        font-size: 12.5px;
        line-height: 1.4;
        color: var(--_text);
        background: var(--_input);
        border: 1px solid var(--_b1);
        border-radius: var(--_r-md);
        overflow-x: auto;
        white-space: nowrap;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 1px 8px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 999px;
        border: 1px solid var(--_b1);
      }
      .status i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .status-on {
        color: var(--_lime);
      }
      .status-off {
        color: var(--_sandy);
      }
      .note {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 12px;
        color: var(--_muted);
      }

      .btn {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0 12px;
        font: inherit;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--_text);
        background: var(--_subtle);
        border: 1px solid var(--_b2);
        border-radius: var(--_r-md);
        cursor: pointer;
        white-space: nowrap;
        transition: border-color 0.15s, background 0.15s;
      }
      .btn:hover:not(:disabled) {
        border-color: var(--_lime);
      }
      .btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .btn-sm {
        padding: 5px 10px;
        font-size: 12px;
        border-radius: var(--_r-sm);
      }

      .tabs {
        display: flex;
        gap: 4px;
        padding: 4px;
        overflow-x: auto;
        background: var(--_card);
        border: 1px solid var(--_b1);
        border-radius: var(--_r-lg);
      }
      .tab {
        flex: 1 0 auto;
        padding: 8px 14px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--_muted);
        background: transparent;
        border: 0;
        border-radius: var(--_r-md);
        cursor: pointer;
        white-space: nowrap;
        transition: color 0.15s, background 0.15s;
      }
      .tab:hover {
        color: var(--_text);
      }
      .tab.active {
        color: var(--_text);
        background: var(--_subtle);
        box-shadow: inset 0 -2px 0 var(--_lime);
      }

      .tab-panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
        min-height: 200px;
      }

      .steps {
        margin: 0;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 13.5px;
        line-height: 1.6;
      }
      .steps li::marker {
        color: var(--_lime);
        font-weight: 700;
      }
      .muted {
        color: var(--_muted);
        font-size: 12px;
      }
      .inline {
        padding: 1px 6px;
        font-size: 12px;
        background: var(--_subtle);
        border-radius: var(--_r-sm);
        word-break: break-all;
      }
      .sub {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 6px 0 0;
        font-size: 13px;
        font-weight: 700;
      }
      .link {
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--_lime);
        text-decoration: none;
      }
      .link:hover {
        text-decoration: underline;
      }

      .code {
        background: var(--_input);
        border: 1px solid var(--_b1);
        border-radius: var(--_r-lg);
        overflow: hidden;
      }
      .code-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px 8px 14px;
        background: var(--_card);
        border-bottom: 1px solid var(--_b1);
      }
      .code-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--_muted);
      }
      pre {
        margin: 0;
        padding: 14px;
        font-size: 12.5px;
        line-height: 1.65;
        overflow-x: auto;
        color: #d6d6dc;
      }
      :host ::ng-deep pre .tk-key {
        color: var(--_sandy);
      }
      :host ::ng-deep pre .tk-str {
        color: var(--_lime);
      }

      .tools {
        list-style: none;
        margin: 0;
        padding: 0;
        border: 1px solid var(--_b1);
        border-radius: var(--_r-lg);
        overflow: hidden;
      }
      .tools li {
        display: grid;
        grid-template-columns: minmax(0, 15rem) 1fr;
        gap: 12px;
        align-items: baseline;
        padding: 10px 14px;
        font-size: 13px;
        color: var(--_muted);
      }
      .tools li + li {
        border-top: 1px solid var(--_b1);
      }
      .tool-name {
        font-size: 12px;
        color: var(--_text);
        overflow-wrap: anywhere;
      }

      .chips {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .chip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        font: inherit;
        font-size: 13px;
        text-align: left;
        color: var(--_text);
        background: var(--_card);
        border: 1px solid var(--_b1);
        border-radius: var(--_r-lg);
        cursor: pointer;
        transition: border-color 0.15s;
      }
      .chip:hover {
        border-color: var(--_b2);
      }

      :is(button, a):focus-visible {
        outline: 2px solid var(--_lime);
        outline-offset: 2px;
      }

      @media (max-width: 560px) {
        .head,
        .body {
          padding-left: 16px;
          padding-right: 16px;
        }
        .cred-line {
          flex-direction: column;
        }
        .btn {
          justify-content: center;
          padding: 9px 12px;
        }
        .tools li {
          grid-template-columns: 1fr;
          gap: 2px;
        }
      }
    `,
  ],
})
export class McpGuideModalComponent {
  readonly closed = output<void>();

  private readonly auth = inject(AuthService);

  readonly protocol = MCP_PROTOCOL;
  readonly tools = TOOLS;
  readonly prompts = PROMPTS;
  readonly tabs: readonly { id: TabId; label: string }[] = [
    { id: 'claude', label: 'Claude Desktop' },
    { id: 'chatgpt', label: 'ChatGPT (GPTs y Actions)' },
    { id: 'ides', label: 'Cursor / Antigravity / Windsurf' },
    { id: 'tools', label: 'Herramientas y prompts' },
  ];

  readonly sseUrl = window.location.origin + SSE_PATH;
  readonly infoUrl = window.location.origin + INFO_PATH;

  readonly tab = signal<TabId>('claude');
  readonly copiedKey = signal<string | null>(null);

  /** Token seguro: reactivo a la sesión activa en AuthService o almacenamiento local */
  readonly token = computed(() => {
    return this.auth.currentStudent()?.token || getCachedStudentProfile()?.token || null;
  });

  readonly maskedToken = computed(() => {
    const t = this.token();
    if (!t) return 'No hay una sesión activa. Inicia sesión de nuevo.';
    return t.length > 12 ? `${t.slice(0, 4)}...${t.slice(-4)}` : '••••••••';
  });

  readonly claudeRaw = computed(() => this.claudeJson(this.token() ?? 'TU_TOKEN'));
  readonly claudeHtml = computed(() => this.highlight(this.claudeJson(this.tokenForDisplay())));
  readonly ideRaw = computed(() => this.ideJson(this.token() ?? 'TU_TOKEN'));
  readonly ideHtml = computed(() => this.highlight(this.ideJson(this.tokenForDisplay())));

  private copyTimer?: ReturnType<typeof setTimeout>;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  async copy(key: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copiedKey.set(key);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copiedKey.set(null), 1800);
    } catch {
      this.copiedKey.set(null);
    }
  }

  private tokenForDisplay(): string {
    const t = this.token();
    if (!t) return 'TU_TOKEN';
    return t.length > 12 ? `${t.slice(0, 4)}...${t.slice(-4)}` : 'TU_TOKEN';
  }

  private claudeJson(token: string): string {
    return JSON.stringify(
      {
        mcpServers: {
          [SERVER_NAME]: {
            command: 'npx',
            args: [
              '-y',
              '@modelcontextprotocol/server-sse',
              this.sseUrl,
              '--headers',
              `Authorization: Bearer ${token}`,
            ],
          },
        },
      },
      null,
      2,
    );
  }

  private ideJson(token: string): string {
    return JSON.stringify(
      {
        mcpServers: {
          [SERVER_NAME]: {
            url: this.sseUrl,
            headers: { Authorization: `Bearer ${token}` },
          },
        },
      },
      null,
      2,
    );
  }

  private highlight(json: string): string {
    const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(
      /("(?:[^"\\]|\\.)*")(\s*:)?/g,
      (_m, str: string, colon?: string) =>
        colon
          ? `<span class="tk-key">${str}</span>${colon}`
          : `<span class="tk-str">${str}</span>`,
    );
  }
}
