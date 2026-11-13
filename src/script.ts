import type { SceneKind } from './scene';
import type { Door } from './wall';

/** Sav tekst igre. Glure i barba Šime govore dalmatinski (ikavica), gospon Štef zagrebački. */

export type Who = 'glure' | 'sime' | 'stef' | 'narator';

export interface Line {
  who: Who;
  text: string;
}

export interface ChoiceDef {
  polite: { label: string; say: string };
  brutal: { label: string; say: string };
  /** Glure pokuša slagati. Nikad ne uspije. */
  lie: { label: string; say: string };
  replyPolite: Line[];
  replyBrutal: Line[];
}

export type Beat = Line | { choice: ChoiceDef };

export const NAMES: Record<Who, string> = {
  glure: 'Glure',
  sime: 'Barba Šime',
  stef: 'Gospon Štef',
  narator: '',
};

const n = (text: string): Line => ({ who: 'narator', text });
const g = (text: string): Line => ({ who: 'glure', text });
const s = (text: string): Line => ({ who: 'sime', text });
const z = (text: string): Line => ({ who: 'stef', text });

export const PROLOG: Beat[] = [
  n('Negdje u Dalmaciji, između mora i kamena, živi Glure. Klesar. Zidar. Čovjek od malo riječi.'),
  n('Glure u životu nije slagao. Ne zato što je svetac – nego zato što mu, jednostavno, ne ide.'),
  g('Kamen ne laže. Pa neću ni ja. Ajmo radit.'),
];

export interface JobEvent {
  id: string;
  /** Okidač: postotak sazidanog zida (0..1), "marenda" ili "skart" (prvi bačeni škart). */
  at: number | 'marenda' | 'skart';
  script: Beat[];
}

export interface JobDef {
  no: number;
  title: string;
  place: string;
  client: Exclude<Who, 'glure' | 'narator'>;
  scene: SceneKind;
  W: number;
  H: number;
  door: Door | null;
  price: number;
  /** Odbici u eurima: fuga na fugu, rupa, šupalj kamen, loš nadvoj. */
  fines: { aligned: number; hole: number; cracked: number; lintel: number };
  startMin: number;
  endMin: number;
  /** Vjerojatnosti širina kamena (1..4 pedlja). */
  weights: number[];
  crackVisible: number;
  crackHidden: number;
  test: 'koza' | 'bura';
  intro: Beat[];
  events: JobEvent[];
  testIntro: Beat[];
  verdict: { great: Beat[]; ok: Beat[]; poor: Beat[] };
  fajrunt: Beat[];
  quips: string[];
  /** Opis mjera za račun. */
  dims: string;
  clientFull: string;
  tip: { label: string; great: string; greatRude: string; ok: string; poor: string };
  billQuote: { great: string; ok: string; poor: string };
}

export const JOBS: JobDef[] = [
  {
    no: 1,
    title: 'Suhozid barba Šime',
    place: 'Maslinik iznad mora',
    client: 'sime',
    scene: 'maslinik',
    W: 10,
    H: 4,
    door: null,
    price: 400,
    fines: { aligned: 10, hole: 15, cracked: 20, lintel: 0 },
    startMin: 7 * 60,
    endMin: 15 * 60,
    weights: [0.3, 0.4, 0.3, 0],
    crackVisible: 0.16,
    crackHidden: 0,
    test: 'koza',
    intro: [
      n('Maslinik barba Šime. Sedam ujutro. Cvrčci se tek zagrijavaju.'),
      s('Glure! Dobro jutro. Triba mi suhozid oko maslina. Koza mi svako jutro završi susidu u kupusu.'),
      g('Dobro jutro, barba Šime. Može. Deset pedalja dug, četiri reda visok. Četristo eura.'),
      s('Četristo?! Za kamenje koje već leži po mojoj zemlji?!'),
      {
        choice: {
          polite: {
            label: 'Kamen je vaš, ruke su moje.',
            say: 'Kamen je vaš, barba Šime. Ali ruke su moje, a one ne rade džabe.',
          },
          brutal: {
            label: 'Za dvjesto dobijete gomilu.',
            say: 'Za četristo dobijete zid. Za dvjesto dobijete gomilu – a gomilu već imate.',
          },
          lie: {
            label: 'To je akcijska cijena!',
            say: 'To van je, barba Šime, akcijska cij… nije. Nije akcijska. Uvik je četristo. Oprostite, pokuša san.',
          },
          replyPolite: [s('E, tako se govori. Ajde, zidaj.')],
          replyBrutal: [s('Jezik ti je oštriji od dlijeta. Ajde, zidaj.')],
        },
      },
      s('Samo da mi koza Bilka više ne priđe priko!'),
      g('Zid ću složit pošteno. Za kozu ne odgovaran. Ona je svoja.'),
      n('Složi suhozid do konopa. Zlatno pravilo: fuga na fugu ne ide – svaki kamen mora preklopiti spoj ispod sebe.'),
    ],
    events: [
      {
        id: 'skart',
        at: 'skart',
        script: [
          s('Šta to bacaš?! To je dobar kamen, samo je malo puka!'),
          g('Barba Šime, i jaje je dobro dok malo ne pukne.'),
          s('…Bacaj.'),
        ],
      },
      {
        id: 'marenda',
        at: 'marenda',
        script: [
          n('Deset sati. Marenda. U Dalmaciji je to zakon stariji od Ustava.'),
          g('Stajen. Kamen može čekat. Pršut ne može.'),
          s('A ko ti plaća tih po ure dok žvačeš?'),
          {
            choice: {
              polite: {
                label: 'Marendu ne naplaćujem.',
                say: 'Niko. Marendu ne naplaćujen. Na račun pišen: pauza, po ure, nula eura.',
              },
              brutal: {
                label: 'Platili biste – da sam kao drugi.',
                say: 'Vi biste – da san ka drugi majstori. Al nisan. Pa žvačen o svom trošku.',
              },
              lie: {
                label: 'Marenda je dio temelja.',
                say: 'Marenda van je, znate, dio… temelja… Nije. Marenda je marenda. Ne naplaćujen je.',
              },
              replyPolite: [s('Prvi majstor koji mi je to reka. Evo ti i malo sira.')],
              replyBrutal: [s('Bezobrazan, a pošten. Ne znan šta je gore.')],
            },
          },
        ],
      },
      {
        id: 'vesmasina',
        at: 0.62,
        script: [
          s('Slušaj, Glure. Unutra u zid ubaci šta god. Šutu, stare kupe, onu vešmašinu iza kuće. Ko će gledat unutra?'),
          {
            choice: {
              polite: {
                label: 'Ja ću znati. I zid će znati.',
                say: 'Ja ću znat da je unutra. I zid će znat. A zid ne zna šutit ka ja.',
              },
              brutal: {
                label: 'Vešmašinu na otpad, ne u zid.',
                say: 'Vešmašinu vozite na reciklažno dvorište. Meni u zid ide samo kamen.',
              },
              lie: {
                label: 'Obećati pa ne napraviti',
                say: 'Može, ubacit ću je… Ne mogu. Ne mogu ni obećat pa ne napravit. To su dvi laži po cijeni jedne.',
              },
              replyPolite: [s('Dobro, dobro. Samo pitan.')],
              replyBrutal: [s("Stoji tamo od '98. Može još koju godinu.")],
            },
          },
        ],
      },
    ],
    testIntro: [
      n('Zadnji kamen je legao. A svaki suhozid u Dalmaciji prolazi istu tehničku inspekciju: kozu.'),
      s('Bilka! Ajde, mila. Pokaži majstoru šta misliš.'),
    ],
    verdict: {
      great: [s('Ni kamenčić se nije maka. Glure, ovo je zid za unuke.'), g('I za njihove koze.')],
      ok: [
        s('Stoji. Tu i tamo je zaškripalo, ali stoji.'),
        g('Zaškripalo je di san ja falija. Odbit ću to na računu.'),
      ],
      poor: [s('Glure… koza se smije.'), g('Vidin. Ima i pravo. Sve ću odbit na računu.')],
    },
    fajrunt: [
      n('Fajrunt! Tri su ure, a zid nije gotov.'),
      g('Nisan stiga. Šta nije sazidano, neću ni naplatit.'),
    ],
    quips: [
      'Nije to loše… za te pare.',
      'U moje vrime zid se zida bez pauze. I bez pitanja.',
      'Pazi na masline! Starije su od tebe.',
      'Bilka te gleda. Ona sve pamti.',
    ],
    dims: '10 pedalja × 4 reda',
    clientFull: 'barba Šime, maslinik iznad mora',
    tip: {
      label: 'Zahvalnost barba Šime',
      great: 'litra ulja i komad sira',
      greatRude: 'litra ulja (bez sira)',
      ok: 'kimanje glavom',
      poor: 'pogled bez riječi',
    },
    billQuote: {
      great: '„Zid za unuke. I za njihove koze.“ — barba Šime',
      ok: '„Stoji. Tu i tamo škripi, ali stoji.“ — barba Šime',
      poor: '„Koza se smije. Glure se ne smije.“ — barba Šime',
    },
  },
  {
    no: 2,
    title: 'Konoba gospona Štefa',
    place: 'Selo iznad mora',
    client: 'stef',
    scene: 'selo',
    W: 12,
    H: 5,
    door: { col: 5, w: 2, h: 3 },
    price: 1200,
    fines: { aligned: 20, hole: 30, cracked: 40, lintel: 80 },
    startMin: 7 * 60,
    endMin: 16 * 60 + 30,
    weights: [0.28, 0.34, 0.26, 0.12],
    crackVisible: 0.09,
    crackHidden: 0.17,
    test: 'bura',
    intro: [
      n('Tjedan dana kasnije. Selo iznad mora. Pred starom kućom stoji čovjek u sandalama i čarapama.'),
      z('Majstore! Dobar dan! Ja sam Štef, iz Zagreba. Kupil sam ovo imanje i bum si složil autentičnu dalmatinsku konobu. Za goste! Sto dvadeset eura noć!'),
      g('Dobar dan. Ovo je bia kokošinjac.'),
      z('Kaj god! Treba mi pročelje. Dvanaest pedalja, pet redova, vrata su već tu. Ali gle, da skratimo: na internetu sam videl kamen-tapetu. Zalepiš – i gotovo!'),
      {
        choice: {
          polite: {
            label: 'Kamen ne dolazi u roli.',
            say: 'Gospodine Štef, kamen ne dolazi u roli. Dolazi u karijoli.',
          },
          brutal: {
            label: 'Bura skida i prave krovove.',
            say: 'Tapetu lipite u dnevni boravak. Ovde bura skida i prave krovove, a kamoli naljepnice.',
          },
          lie: {
            label: 'Reći da je ideja odlična',
            say: 'Ideja van je odli… odvratna. Oprostite. Tija san bit pristojan, a izašlo je pošteno.',
          },
          replyPolite: [z('Joj, dobro, dobro. Pravi kamen. Bu bar na slikama ljepše.')],
          replyBrutal: [z('Isuse, pa samo pitam! Dobro, pravi kamen.')],
        },
      },
      z('Ali nad vratima složite kaj bilo. To bu ionak pokrila bugenvilija.'),
      g('Nad vrata ide nadvoj. Jedan kamen, četiri pedlja, da s obe strane legne na zid. Dva komada nad vratima nisu nadvoj. To je giljotina.'),
      n('Novo: neki kamen izgleda zdravo, a iznutra je šupalj. Kucni ga (K) prije ugradnje – zdrav kamen zvoni, šupalj tupo jekne.'),
    ],
    events: [
      {
        id: 'stiropor',
        at: 0.28,
        script: [
          z('Majstore, a jel bi mogli unutra staviti stiropor? Zbog energetskog certifikata. A kamen samo izvana, tanko – ko carpaccio.'),
          {
            choice: {
              polite: {
                label: 'Pola metra kamena je certifikat.',
                say: 'Po metra kamena je sam sebi certifikat. Liti ladno, zimi suho. Tako je petsto godina.',
              },
              brutal: {
                label: 'Carpaccio je u restoranu.',
                say: 'Ako oćete carpaccio, idite u restoran. Ja zidan zid.',
              },
              lie: {
                label: 'Stiropora nema u Dalmaciji.',
                say: 'Stiropora van nema u cijeloj Dalmac… ima ga. Ima ga u svakom dućanu. Al ja ga u zid ne stavljan.',
              },
              replyPolite: [z('Petsto godina? To bum stavil u oglas!')],
              replyBrutal: [z('Vi ste jako direktni, znate?')],
            },
          },
        ],
      },
      {
        id: 'marenda',
        at: 'marenda',
        script: [
          n('Deset sati. Marenda.'),
          z('Kaj, već pauza?! Pa tek ste počeli!'),
          g('Ja san počeja u sedan. Vi ste počeli u devet i po. S kavom.'),
          z('Evo, da ne gubite vrijeme: probajte moj proteinski smoothie. Špinat, chia i kolagen.'),
          {
            choice: {
              polite: {
                label: 'Hvala, imam svoje.',
                say: 'Fala, iman svoje. Kruv, sir i dvi slane srdele.',
              },
              brutal: {
                label: 'Zeleno jedem samo kad je blitva.',
                say: 'Ja zeleno jiden samo kad je blitva. I to s krumpiron.',
              },
              lie: {
                label: 'Reći da je smoothie ukusan',
                say: "Mmm. Baš je… ka pokošena trava iz miksera. Oprostite. Tija san reć 'fino'.",
              },
              replyPolite: [z('Srdele? Za doručak? Fakat ste autentični.')],
              replyBrutal: [z('Blitva… Zapisal bum si to. Za jelovnik.')],
            },
          },
        ],
      },
      {
        id: 'stoljece',
        at: 0.64,
        script: [
          z("Zadnje pitanje! U oglas bum napisal: 'kamena kuća iz 15. stoljeća'. Vi ste stručnjak – ak neko pita, samo potvrdite."),
          {
            choice: {
              polite: {
                label: 'Zid je od ovog tjedna.',
                say: 'Mogu potvrdit da je zid od ovog tjedna. Al složen je ka u petnaestom stoljeću.',
              },
              brutal: {
                label: "Kokošinjac je bio iz '74.",
                say: 'Kuća je od ovog tjedna. Kokošinjac je bia iz sedandeset četvrte. Kokoši su bile poštenije.',
              },
              lie: {
                label: 'Potvrditi 15. stoljeće',
                say: 'Potvrđujen. Kuća je iz petnaestog… lipnja. Ove godine. Eto. Skoro san uspija.',
              },
              replyPolite: [z("Dobro, bum napisal 'bezvremenska'.")],
              replyBrutal: [z('Joj, majstore, vi bi mi otjerali sve goste.')],
            },
          },
        ],
      },
    ],
    testIntro: [
      n('Pročelje je gotovo. Druga tehnička inspekcija dolazi s planine i ne najavljuje se: bura.'),
      z("Kaj je sad ovo?! U prognozi je pisalo 'povjetarac'!"),
    ],
    verdict: {
      great: [
        z('Šešir mi je odletel do Italije, a zid se nije ni pomaknul! Majstore, vi ste genijalac!'),
        g('Nisan. Samo ne lažen kamenu.'),
      ],
      ok: [z('Malo se treslo, ali drži! Kaj ne?'), g('Drži. Di se treslo, tu san ja kriv. Odbit ću na računu.')],
      poor: [
        z('Majstore… ovo se njiše.'),
        g('Njiše se. Sram me. Odbit ću sve na računu, a zid ću prezidat u subotu. Džabe.'),
      ],
    },
    fajrunt: [
      n('Fajrunt! Pola pet, a pročelje nije gotovo.'),
      g('Nisan stiga. Šta nije sazidano, neću ni naplatit.'),
    ],
    quips: [
      'Jel bi to moglo malo brže? Sezona je za dva tjedna!',
      'Samo da slikam za Instagram… #autenticno',
      'Kolko to košta po kvadratu? Ne, nemojte mi reći.',
      'Ima tu negdje wifi?',
    ],
    dims: '12 pedalja × 5 redova',
    clientFull: 'gospon Štef, Zagreb',
    tip: {
      label: 'Recenzija gospona Štefa',
      great: '★★★★★',
      greatRude: '★★★★☆ (zbog jezika)',
      ok: '★★★☆☆',
      poor: '★☆☆☆☆',
    },
    billQuote: {
      great: '„Majstor je bezobrazno pošten, ali zid je savršen. Šešir nije preživio.“ — gospon Štef',
      ok: '„Zid drži. Majstor mi nije dao ni tapetu ni stiropor.“ — gospon Štef',
      poor: '„Njiše se. Majstor kaže da će prezidati u subotu, džabe. Vjerujem mu.“ — gospon Štef',
    },
  },
];

export const FINALE: Beat[] = [
  n('Dva zida. Nula laži. Jedan izgubljen šešir.'),
  g('Kamen po kamen – palača. Laž po laž – apartman.'),
];

export const GLURE_QUIPS = [
  'Polako. Kamen se ne žuri.',
  'Fuga na fugu ne ide. Ni u zidu, ni u životu.',
  'Ne gledaj mene, gledaj konop.',
  'Dvaput miri, jednom kleši.',
  'Dobar zid se ne vidi. Vidi se samo loš.',
  'Beton? Tu rič u mom dvoru ne spominji.',
];

export const HONESTY_QUIPS = [
  'Poštenje: 100 %. Niže ne ide. Pokušali smo.',
  'Mjerač je zavaren na sto. Glure ga je osobno zavario.',
  'Ne klikaj. Neće pasti.',
  'Postoji samo jedna postavka: pošteno.',
];

export const T = {
  hintStart: 'Odaberi kamen s gomile (tipke 1–3) i klikni na zid. Kamen pada na prvo slobodno mjesto.',
  hintBond: 'Zeleni obris = dobar preklop. Narančasti = fuga na fugu ili rupa. Biraj kamen koji premošćuje spoj ispod sebe.',
  hintCrack: 'Vidiš pukotinu? To je škart. Odbaci ga (X) – Glure takav kamen ne ugrađuje.',
  hintTap: 'Kucni (K) kamen prije ugradnje. Kucanje troši 5 minuta, ali šupalj kamen u zidu košta puno više.',
  hintLintel: 'Nad vrata ide nadvoj: kamen od 4 pedlja točno preko vrata, tako da s obje strane legne na zid.',
  refuse: 'Škart ne ide u zid!',
  refuseHint: 'Glure ne ugrađuje škart. Odbaci ga (X).',
  tooHigh: 'Previsoko – zid ide do konopa.',
  tink: 'TINK! Zdrav ka dren.',
  tup: 'TUP… Šupalj!',
  already: 'Već je kucnut.',
  alreadyVisible: 'Vidi se i bez kucanja.',
  toScrap: 'U škart!',
  goodNose: 'Dobar nos – bio je šupalj!',
  returned: 'Zdrav. Vraćen na gomilu.',
  overlap: 'Preklop!',
  seated: 'Leglo.',
  foundation: 'Temelj.',
  aligned: 'Fuga na fugu!',
  hole: 'Rupa!',
  lintel: 'Nadvoj! Ka iz knjige.',
  lintelBad: 'Nadvoj ne valja!',
  crack: 'KRC!',
  ghostOk: 'preklop ✓',
  ghostAligned: 'fuga na fugu!',
  ghostHole: 'rupa!',
  ghostHigh: 'previsoko',
  ghostLintel: 'nadvoj ★',
  ghostScrap: 'škart!',
  spans: ['', '1 pedalj', '2 pedlja', '3 pedlja', '4 pedlja'],
  badgeOk: 'zdrav',
  badgeBad: 'škart',
  badgeUnknown: '?',
};
