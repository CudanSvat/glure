# Glure – pošteni klesar

Kratka komična igra na hrvatskom o Gluri, klesaru koji ne zna slagati. Složi suhozid barba Šimi i pročelje konobe gosponu Štefu – kamen po kamen, bez fuge na fugu, bez škarta i bez muljanja.

Igra izgleda trodimenzionalno, ali je čisti 2.5D: kosa projekcija na Canvas2D, slojevita pozadina i DOM sučelje. Bez WebGL-a i bez game enginea.

## Pokretanje

Treba Node.js 20 ili noviji.

```bash
npm install
npm run dev      # razvojni server
npm run build    # provjera tipova + produkcijski build u dist/
npm start        # poslužuje dist/ (serve -s dist)
```

## Kontrole

| Radnja | Miš / dodir | Tipkovnica |
| --- | --- | --- |
| Odaberi kamen | klik na kamen u gomili | `1` `2` `3` |
| Namjesti | pomak miša iznad zida | strelice ili `A` / `D` |
| Postavi | klik na zid | razmaknica ili `Enter` |
| Kucni čekićem | gumb Kucni | `K` |
| Odbaci kamen | gumb Odbaci | `X` |
| Zvuk / pomoć | gumbi gore desno | `M` / `H` |

## Deploy na Railway

Igra je statična stranica, pa ne treba nikakva dodatna konfiguracija:

1. Na Railwayu napravi novi projekt iz ovog GitHub repozitorija.
2. Railway sam pokreće `npm install`, `npm run build` i `npm start`.
3. `npm start` je `serve -s dist`, a `serve` sluša na portu iz varijable `PORT` koju Railway postavlja.
4. U postavkama servisa generiraj javnu domenu.

## Struktura

- `src/game.ts` – tijek igre, unos, crtanje scene
- `src/wall.ts` – pravila zida (fuge, rupe, nadvoj, ocjena kvalitete)
- `src/script.ts` – sav tekst i dijalozi, definicije poslova
- `src/scene.ts`, `src/people.ts`, `src/sprites.ts` – pozadina, likovi i kamenje
- `src/audio.ts` – zvukovi sintetizirani kroz WebAudio
