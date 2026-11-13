import type { Sfx } from './audio';
import { drawPortrait, GLURE, SIME, STEF, type Look } from './people';
import { NAMES, type Beat, type ChoiceDef, type Line, type Who } from './script';

const LOOKS: Record<Exclude<Who, 'narator'>, Look> = { glure: GLURE, sime: SIME, stef: STEF };
const PITCH: Record<Who, number> = { glure: 150, sime: 205, stef: 290, narator: 0 };

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export type ChoiceKind = 'polite' | 'brutal';

/** Dijaloški okvir: tekst se ispisuje slovo po slovo, izbori su gumbi. */
export class Dialogue {
  active = false;
  /** Tko trenutačno govori (za animaciju usta u sceni). */
  speaker: Who | null = null;
  talking = false;

  private root = $('dialogue');
  private nameEl = $('dlg-name');
  private shownEl = $('dlg-shown');
  private restEl = $('dlg-rest');
  private choicesEl = $('dlg-choices');
  private nextEl = $('dlg-next');
  private portrait = $<HTMLCanvasElement>('dlg-portrait');
  private pctx = this.portrait.getContext('2d') as CanvasRenderingContext2D;

  private text = '';
  private shown = 0;
  private blipAt = 0;
  private onAdvance: (() => void) | null = null;
  private choiceKeys: (() => void)[] = [];

  constructor(
    private sfx: Sfx,
    private onLie: () => void,
    private onPick: (kind: ChoiceKind) => void,
  ) {
    this.root.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      this.advance();
    });
  }

  async run(beats: Beat[]): Promise<void> {
    this.active = true;
    this.root.classList.remove('hidden');
    for (const beat of beats) {
      if ('choice' in beat) await this.choose(beat.choice);
      else await this.say(beat);
    }
    this.root.classList.add('hidden');
    this.active = false;
    this.speaker = null;
    this.talking = false;
  }

  private say(line: Line): Promise<void> {
    this.speaker = line.who;
    this.text = line.text;
    this.shown = 0;
    this.blipAt = 0;
    this.talking = true;
    this.choicesEl.replaceChildren();
    this.root.classList.toggle('narrator', line.who === 'narator');
    this.root.dataset.who = line.who;
    this.nameEl.textContent = NAMES[line.who];
    this.nextEl.classList.add('wait');
    this.renderText();
    return new Promise((resolve) => {
      this.onAdvance = resolve;
    });
  }

  private async choose(c: ChoiceDef): Promise<void> {
    let lieUsed = false;
    for (;;) {
      const pick = await this.askChoice(c, lieUsed);
      if (pick === 'lie') {
        lieUsed = true;
        this.onLie();
        this.sfx.nope();
        await this.say({ who: 'glure', text: c.lie.say });
        continue;
      }
      this.onPick(pick);
      await this.say({ who: 'glure', text: pick === 'polite' ? c.polite.say : c.brutal.say });
      for (const l of pick === 'polite' ? c.replyPolite : c.replyBrutal) await this.say(l);
      return;
    }
  }

  private askChoice(c: ChoiceDef, lieUsed: boolean): Promise<'polite' | 'brutal' | 'lie'> {
    this.speaker = 'glure';
    this.talking = false;
    this.root.classList.remove('narrator');
    this.root.dataset.who = 'glure';
    this.nameEl.textContent = NAMES.glure;
    this.text = lieUsed ? 'Dobro. Onda pošteno:' : 'Što će Glure reći?';
    this.shown = this.text.length;
    this.renderText();
    this.nextEl.classList.add('wait');
    this.onAdvance = null;

    return new Promise((resolve) => {
      const opts: { kind: 'polite' | 'brutal' | 'lie'; tag: string; label: string }[] = [
        { kind: 'polite', tag: 'Pristojno', label: c.polite.label },
        { kind: 'brutal', tag: 'Brutalno pošteno', label: c.brutal.label },
        { kind: 'lie', tag: 'Slagati', label: c.lie.label },
      ];
      this.choiceKeys = [];
      const buttons = opts.map((o, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `choice choice-${o.kind}`;
        const disabled = o.kind === 'lie' && lieUsed;
        b.innerHTML = `<kbd>${i + 1}</kbd><span class="choice-tag"></span><span class="choice-label"></span>`;
        (b.querySelector('.choice-tag') as HTMLElement).textContent = disabled ? 'Ne ide' : o.tag;
        (b.querySelector('.choice-label') as HTMLElement).textContent = o.label;
        const go = (): void => {
          if (disabled) {
            this.sfx.nope();
            b.classList.remove('shake');
            void b.offsetWidth;
            b.classList.add('shake');
            return;
          }
          this.sfx.click();
          this.choiceKeys = [];
          this.choicesEl.replaceChildren();
          resolve(o.kind);
        };
        if (disabled) b.classList.add('struck');
        b.addEventListener('click', go);
        this.choiceKeys.push(go);
        return b;
      });
      this.choicesEl.replaceChildren(...buttons);
    });
  }

  private renderText(): void {
    const k = Math.floor(this.shown);
    this.shownEl.textContent = this.text.slice(0, k);
    this.restEl.textContent = this.text.slice(k);
  }

  /** Klik / razmaknica: dovrši ispis ili idi dalje. */
  advance(): void {
    if (!this.active || !this.onAdvance) return;
    if (this.shown < this.text.length) {
      this.shown = this.text.length;
      this.renderText();
      this.talking = false;
      this.nextEl.classList.remove('wait');
      return;
    }
    const fn = this.onAdvance;
    this.onAdvance = null;
    this.sfx.click();
    fn();
  }

  handleKey(e: KeyboardEvent): boolean {
    if (!this.active) return false;
    if (this.choiceKeys.length) {
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i >= 0) this.choiceKeys[i]?.();
      return true;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.advance();
    }
    return true;
  }

  update(dt: number, t: number): void {
    if (!this.active) return;
    if (this.shown < this.text.length) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.text.length, this.shown + dt * 48);
      const now = Math.floor(this.shown);
      if (now !== before) {
        this.renderText();
        if (now - this.blipAt >= 3 && this.speaker && PITCH[this.speaker] > 0) {
          const ch = this.text[now - 1] ?? ' ';
          if (ch !== ' ') this.sfx.blip(PITCH[this.speaker] * (0.94 + Math.random() * 0.14));
          this.blipAt = now;
        }
      }
      if (this.shown >= this.text.length) {
        this.talking = false;
        this.nextEl.classList.remove('wait');
      }
    }
    // Portret
    const who = this.speaker;
    const size = this.portrait.width;
    this.pctx.clearRect(0, 0, size, size);
    if (who && who !== 'narator') {
      const talk = this.talking ? 0.5 + 0.5 * Math.sin(t * 19) : 0;
      drawPortrait(this.pctx, LOOKS[who], size, t, talk);
    }
  }
}
