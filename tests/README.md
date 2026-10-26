# Testovi

Testovi ne diraju pravu bazu. Rade na **Firebase emulatoru** (lažna baza i lažna
anonimna prijava na tvom računaru) i u **headless Chromiumu** (browser bez prozora).

| Fajl | Šta provjerava |
|---|---|
| `rules.test.mjs` | Pravila baze (`database.rules.json`): ko smije čitati i pisati šta. Npr. projektor ne može pročitati PIN ni prijedloge izmjena, učesnik ne može mijenjati tuđi tekst. |
| `i18n.test.mjs` | Prevodi: svaki jezik ima sve tekstove, i iste `{rupe}` kao engleski. |
| `app.test.mjs` | Cijela aplikacija: facilitator (mobitel 375 px), projektor i učesnici, svaki sa svojim anonimnim uid-om. Pravi i screenshotove u `tests/screenshots/`. |
| `helpers.mjs` | Pomoćnici: mali web server za aplikaciju, "uređaji", spajanje na emulator. |

## Pokretanje

Treba: Node.js 20+ i Java 11+ (za emulator baze).

```
cd tests
npm install
npx playwright install chromium   # samo prvi put
npm test
```

`npm test` sam pokrene emulator, pusti sve testove i ugasi emulator. Na kraju piše
`# pass …` i `# fail 0` ako je sve u redu.

Aplikacija se pri testu servira **tačno onakva kakva je u repou**; samo
`js/firebase-config.js` i `js/firebase.js` dobiju (u letu, ne na disku) adresu
emulatora umjesto prave baze, a Firebase se učitava iz `node_modules` (ista verzija 10.12.2).
