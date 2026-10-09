# Učenje uz Common Ground

Ovdje se skupljaju pojmovi koje susrećemo dok gradimo aplikaciju. Svaki pojam ima kratko objašnjenje i primjer iz ovog projekta. Fajl raste sa svakom fazom.

---

## Faza 1: Osnova

### HTML, CSS i JavaScript
Tri jezika od kojih je napravljena svaka web stranica.
- **HTML** opisuje *šta* je na stranici (naslov, polje za unos, dugme). Primjer: `index.html` ima polje za kod i polje za nadimak.
- **CSS** opisuje *kako to izgleda* (boje, veličine, raspored). Primjer: `css/screen.css` pravi crnu pozadinu i ogromna slova za projektor.
- **JavaScript** opisuje *šta se dešava* (klik na dugme, slanje podataka). Primjer: `js/participant.js` šalje nadimak u bazu kad učesnik klikne "Join".

### Statička stranica i GitHub Pages
"Statička" znači da server samo šalje fajlove onakve kakvi jesu, bez ikakvog programa na serveru. GitHub Pages besplatno objavljuje fajlove iz repoa kao web stranicu. Sav "rad" radi browser, a podatke dijeli Firebase.

### Bez build koraka, bez frameworka
Mnogi projekti koriste alate (React, Vite…) koji kod prvo "prevode" prije objave. Mi to ne radimo: fajl koji vidiš u repou je tačno fajl koji browser učitava. Lakše je za čitanje i nema ništa što se može pokvariti između.

### ES moduli (`import` / `export`)
Način da JavaScript bude podijeljen u više malih fajlova koji koriste jedni druge.
Primjer: `js/session.js` ima `export function createSession(...)`, a `js/host.js` ga koristi sa `import { createSession } from "./session.js"`.
U HTML-u se modul učitava sa `<script type="module" src="js/host.js">`.

### CDN i fiksna verzija
CDN je javni server sa kojeg se učitavaju gotove biblioteke. Firebase učitavamo sa `www.gstatic.com/firebasejs/10.12.2/...`. Broj `10.12.2` je **fiksna verzija**: aplikacija se ne može sama od sebe pokvariti kad Google objavi novu verziju. QR biblioteku učitavamo sa `cdnjs.cloudflare.com`.

### Firebase
Googleova usluga koja nam daje bazu podataka i prijavu korisnika, bez da mi pravimo server.

### Firebase Realtime Database (baza uživo)
Baza koja izgleda kao jedno veliko stablo (kao folderi i podfolderi). Posebna je jer **javlja promjene odmah**: kad učesnik uđe, projektor to vidi za djelić sekunde, bez osvježavanja.
Naše stablo u ovoj fazi:
```
sessions
  └─ ROND
       ├─ meta        { hostUid: "abc123", createdAt: 1761552000000 }
       ├─ members
       │    └─ xyz789: true
       └─ nicknames
            └─ xyz789: "Lion"
```

### Listener (slušač) – `onValue`
Funkcija koja kaže: "javi mi svaki put kad se ovaj dio baze promijeni". Primjer: `watchMemberCount` u `js/session.js` sluša `sessions/ROND/members` i projektor odmah ispiše novi broj učesnika.

### Anonimna prijava (Firebase Anonymous Authentication)
Firebase svakom browseru da nasumičan identitet, bez imena, emaila ili lozinke. Taj identitet se zove **uid** (npr. `xyz789`).
Važno: browser pamti uid, pa nakon osvježavanja stranice ostaje **isti uid**. Zato učesnik i facilitator ostaju u istoj sesiji. Vidi `ensureSignedIn()` u `js/firebase.js`.

### uid (user id)
Jedinstvena oznaka anonimnog korisnika. Odgovori i članstvo se u bazi vežu za uid, nikad za nadimak. Primjer: `sessions/ROND/members/xyz789: true`.

### Pravila baze (Security Rules)
Pravila koja Firebase provjerava **na serveru** za svako čitanje i pisanje. Kod u browseru svako može promijeniti, ali pravila ne može zaobići. Čuvamo ih u `database.rules.json` i ručno kopiramo u Firebase konzolu.
Primjeri iz našeg fajla:
- `".read": false` na vrhu → po defaultu niko ne može ništa čitati.
- `"auth.uid === $uid"` → možeš upisati samo svoj članski zapis, ne tuđi.
- `"!data.exists()"` → sesija se može napraviti, ali postojeća se ne može prepisati.
- Nadimke (`nicknames`) može čitati samo facilitator čiji je uid upisan u `meta/hostUid`.

### `$code` i `$uid` u pravilima
Znak `$` znači "bilo koji ključ na ovom mjestu". `sessions/$code` važi za `sessions/ROND`, `sessions/ABCD` itd., a unutar pravila `$code` sadrži stvarnu vrijednost.

### `.read`, `.write`, `.validate`
- `.read` – ko smije čitati.
- `.write` – ko smije pisati.
- `.validate` – da li je podatak ispravnog oblika (npr. nadimak je tekst od 1 do 24 znaka).

### `now` i `serverTimestamp()`
`serverTimestamp()` kaže bazi "upiši trenutno vrijeme sa servera" (ne sa mobitela, jer sat na mobitelu može biti pogrešan). U pravilima `now` je to isto vrijeme, pa provjeravamo `createdAt === now`.

### Firebase config nije tajna
`js/firebase-config.js` samo kaže browseru s kojim projektom da razgovara. Svako ga može vidjeti u izvornom kodu bilo koje Firebase stranice. Zaštitu daju pravila baze, ne skrivanje configa.

### Query parametar (`?s=ROND`)
Dio adrese poslije `?`. Stranica ga može pročitati. Primjer: `screen.html?s=ROND` kaže projektoru koju sesiju da prikaže. Funkcija `codeFromUrl()` u `js/session.js` ga čita.

### localStorage
Mala "ladica" u browseru koja pamti tekst i nakon zatvaranja stranice. Mi tu pamtimo samo kod sesije (i nadimak na učesnikovom mobitelu), da bi nakon osvježavanja znali gdje se vratiti. Vidi `js/storage.js`.

### `history.replaceState`
Mijenja adresu u browseru bez ponovnog učitavanja stranice. Kad facilitator napravi sesiju, adresa postane `host.html?s=ROND`, pa i obično osvježavanje vodi nazad u istu sesiju.

### `.info/connected`
Posebno mjesto u Firebase bazi koje kaže da li je browser trenutno povezan. Koristimo ga za crvenu traku "Connection lost. Reconnecting…" (`js/connection.js`). Firebase se sam ponovo poveže kad se Wi-Fi vrati.

### i18n (internacionalizacija)
Skraćenica: između "i" i "n" ima 18 slova. Znači pripremiti aplikaciju za više jezika. Svi tekstovi su u `js/i18n/en.js` pod ključevima, npr. `"participant.join": "Join"`. U HTML-u piše samo `data-i18n="participant.join"`, a `applyTranslations()` u `js/i18n.js` upiše pravi tekst. Kad dodamo bosanski, napravićemo `js/i18n/bs.js` sa istim ključevima.

### `{count}` u tekstovima (parametri)
Tekst `"{count} joined"` ima rupu koja se popuni vrijednošću: `t("screen.participants", { count: 5 })` daje `"5 joined"`. Tako i jezici sa drugačijim redom riječi mogu staviti broj gdje im odgovara.

### `textContent` umjesto `innerHTML`
Kad prikazujemo nešto što je korisnik upisao (nadimak), koristimo `textContent`. Tako, ako neko upiše `<script>…`, to se prikaže kao običan tekst i ne može se izvršiti kao kod.

### QR kod
Kvadratni crtež koji mobitel kamerom pretvori u link. Biblioteka `qrcodejs` ga crta u browseru (`new QRCode(...)` u `js/screen.js`), pa ne trebamo nikakav vanjski servis.

### Viewport jedinice (`vh`, `vw`)
`1vh` = 1% visine ekrana, `1vw` = 1% širine. Projektor koristi ove jedinice (`css/screen.css`), pa se slova sama povećaju ili smanje prema veličini platna.
