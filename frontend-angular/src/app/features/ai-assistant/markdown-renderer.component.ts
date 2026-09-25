import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { getStickerById } from '@data/constants/stickers.config';

@Component({
  selector: 'app-markdown-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-markdown-content text-xs sm:text-sm text-neutral-200 leading-relaxed space-y-2 select-text" [innerHTML]="sanitizedHtml"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class MarkdownRendererComponent implements OnChanges {
  @Input() content = '';

  sanitizedHtml: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.renderMarkdown();
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private renderStickerCard(stickerId: string): string {
    const sticker = getStickerById(stickerId);
    if (!sticker) return '';
    return `
      <div class="my-2 inline-block animate-in zoom-in-95 duration-150 select-none">
        <img 
          src="${sticker.src}" 
          alt="sticker" 
          class="h-auto w-28 sm:w-36 max-w-[150px] rounded-2xl object-cover shadow-md transition-transform duration-200 hover:scale-105 block" 
          loading="lazy" 
        />
      </div>
    `;
  }

  private parseInline(text: string): string {
    // 1. Process stickers before HTML escaping
    const stickerRegex = /\[STICKER:([a-zA-Z0-9_-]+)\]/gi;
    let stickerPlaceholders: { placeholder: string; html: string }[] = [];
    let processed = text.replace(stickerRegex, (_, id) => {
      const card = this.renderStickerCard(id);
      if (card) {
        const ph = `__STICKER_PH_${stickerPlaceholders.length}__`;
        stickerPlaceholders.push({ placeholder: ph, html: card });
        return ph;
      }
      return `[STICKER:${id}]`;
    });

    let out = this.escapeHtml(processed);

    // Links [text](url)
    out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#3a86ff] hover:text-[#60a5fa] hover:underline font-bold transition">$1</a>');

    // Bold **text**
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-white">$1</strong>');

    // Inline code `code`
    out = out.replace(/`(.*?)`/g, '<code class="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-xs text-[#bbf451] tracking-normal">$1</code>');

    // Italic *text*
    out = out.replace(/\*(.*?)\*/g, '<em class="italic text-neutral-300">$1</em>');

    // Restore sticker placeholders
    for (const item of stickerPlaceholders) {
      out = out.replace(item.placeholder, item.html);
    }

    return out;
  }

  private renderMarkdown(): void {
    if (!this.content) {
      this.sanitizedHtml = '';
      return;
    }

    const lines = this.content.split('\n');
    const out: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Bloques de código ```
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          out.push(`
            <pre class="rounded-2xl bg-[#16161b] p-3.5 my-2.5 font-mono text-xs text-[#bbf451] overflow-x-auto border border-white/5">
              <code>${this.escapeHtml(codeBlockContent.join('\n'))}</code>
            </pre>
          `);
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(rawLine);
        continue;
      }

      if (!trimmed) {
        out.push('<div class="h-1.5"></div>');
        continue;
      }

      // Encabezados
      if (trimmed.startsWith('##### ')) {
        out.push(`<h5 class="text-xs font-bold text-[#bbf451] uppercase tracking-wider mt-3 mb-1">${this.parseInline(trimmed.replace('##### ', ''))}</h5>`);
        continue;
      }
      if (trimmed.startsWith('#### ')) {
        out.push(`<h4 class="text-sm font-black text-white mt-3.5 mb-1.5 flex items-center gap-1.5">${this.parseInline(trimmed.replace('#### ', ''))}</h4>`);
        continue;
      }
      if (trimmed.startsWith('### ')) {
        out.push(`<h3 class="text-base font-black text-white mt-4 mb-2 tracking-tight">${this.parseInline(trimmed.replace('### ', ''))}</h3>`);
        continue;
      }
      if (trimmed.startsWith('## ')) {
        out.push(`<h2 class="text-lg font-black text-white mt-4 mb-2 tracking-tight">${this.parseInline(trimmed.replace('## ', ''))}</h2>`);
        continue;
      }
      if (trimmed.startsWith('# ')) {
        out.push(`<h1 class="text-xl font-black text-white mt-4 mb-2 tracking-tight">${this.parseInline(trimmed.replace('# ', ''))}</h1>`);
        continue;
      }

      // Viñetas (- , * , •)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.substring(2);
        out.push(`
          <div class="flex items-start gap-2 text-xs sm:text-sm text-neutral-300 my-1 leading-relaxed pl-2">
            <span class="text-[#bbf451] font-bold mt-0.5 select-none shrink-0">•</span>
            <div class="flex-1">${this.parseInline(bulletText)}</div>
          </div>
        `);
        continue;
      }

      // Listas numeradas (1. 2. 3.)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        out.push(`
          <div class="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300 my-1.5 leading-relaxed pl-1">
            <span class="font-mono font-bold text-neutral-400 shrink-0 text-xs mt-0.5 select-none">${numMatch[1]}.</span>
            <div class="flex-1">${this.parseInline(numMatch[2])}</div>
          </div>
        `);
        continue;
      }

      // Blockquotes (> cita)
      if (trimmed.startsWith('> ')) {
        out.push(`
          <blockquote class="pl-3 py-1 my-2 border-l-2 border-[#ff5722] bg-white/[0.02] rounded-r-xl text-xs text-neutral-300 italic">
            ${this.parseInline(trimmed.replace('> ', ''))}
          </blockquote>
        `);
        continue;
      }

      // Párrafo normal
      out.push(`<p class="my-1 leading-relaxed">${this.parseInline(trimmed)}</p>`);
    }

    if (inCodeBlock && codeBlockContent.length > 0) {
      out.push(`
        <pre class="rounded-2xl bg-[#16161b] p-3.5 my-2.5 font-mono text-xs text-[#bbf451] overflow-x-auto border border-white/5">
          <code>${this.escapeHtml(codeBlockContent.join('\n'))}</code>
        </pre>
      `);
    }

    this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(out.join(''));
  }
}
