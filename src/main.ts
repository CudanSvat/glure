import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import './style.css';
import { Game } from './game';

// Pričekaj font (zbog natpisa na Canvasu), ali ne dulje od sekunde.
const fonts = Promise.all([document.fonts.load('700 20px Cinzel'), document.fonts.load('900 20px Cinzel')]);
const timeout = new Promise((resolve) => window.setTimeout(resolve, 1000));

void Promise.race([fonts, timeout])
  .catch(() => undefined)
  .then(() => {
    const game = new Game();
    // Samo u razvoju: pristup igri iz konzole radi isprobavanja.
    if (import.meta.env.DEV) (window as unknown as { __glure: Game }).__glure = game;
  });
