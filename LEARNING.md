# Učenje uz Common Ground

Ovdje se skupljaju pojmovi koje susrećemo dok gradimo aplikaciju. Svaki pojam ima kratko objašnjenje i primjer iz ovog projekta. Fajl raste sa svakom fazom.

---

## Faza 1: Osnova

### HTML, CSS i JavaScript
Tri jezika od kojih je napravljena svaka web stranica.
- **HTML** opisuje *šta* je na stranici (naslov, polje za unos, dugme). Primjer: `index.html` ima polje za kod i polje za nadimak.
- **CSS** opisuje *kako to izgleda* (boje, veličine, raspored). Primjer: `css/screen.css` pravi crnu pozadinu i ogromna slova za projektor.
- **JavaScript** opisuje *šta se dešava* (klik na dugme, slanje podataka). Primjer: `js/participant.js` upiše učesnika u bazu kad klikne "Join".

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
       └─ members
            └─ xyz789: true
```
(U Fazi 1 tu je bio i `nicknames`. Od Faze 3 nadimak se uopšte ne čuva u bazi, vidi "Podatak koji ne postoji ne može procuriti" niže.)

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
- PIN (`hostPin`) može čitati samo facilitator čiji je uid upisan u `meta/hostUid`.

### `$code` i `$uid` u pravilima
Znak `$` znači "bilo koji ključ na ovom mjestu". `sessions/$code` važi za `sessions/ROND`, `sessions/ABCD` itd., a unutar pravila `$code` sadrži stvarnu vrijednost.

### `.read`, `.write`, `.validate`
- `.read` – ko smije čitati.
- `.write` – ko smije pisati.
- `.validate` – da li je podatak ispravnog oblika (npr. PIN je tekst od tačno 6 cifara).

### `now` i `serverTimestamp()`
`serverTimestamp()` kaže bazi "upiši trenutno vrijeme sa servera" (ne sa mobitela, jer sat na mobitelu može biti pogrešan). U pravilima `now` je to isto vrijeme, pa provjeravamo `createdAt === now`.

### Firebase config nije tajna
`js/firebase-config.js` samo kaže browseru s kojim projektom da razgovara. Svako ga može vidjeti u izvornom kodu bilo koje Firebase stranice. Zaštitu daju pravila baze, ne skrivanje configa.

### Query parametar (`?s=ROND`)
Dio adrese poslije `?`. Stranica ga može pročitati. Primjer: `screen.html?s=ROND` kaže projektoru koju sesiju da prikaže. Funkcija `codeFromUrl()` u `js/session.js` ga čita.

### localStorage
Mala "ladica" u browseru koja pamti tekst i nakon zatvaranja stranice. Mi tu pamtimo kod sesije, nadimak (samo na učesnikovom mobitelu, nikad u bazi) i kodove šablona, da bi nakon osvježavanja znali gdje se vratiti. Vidi `js/storage.js`.

### `history.replaceState`
Mijenja adresu u browseru bez ponovnog učitavanja stranice. Kad facilitator napravi sesiju, adresa postane `host.html?s=ROND`, pa i obično osvježavanje vodi nazad u istu sesiju.

### `.info/connected`
Posebno mjesto u Firebase bazi koje kaže da li je browser trenutno povezan. Koristimo ga za crvenu traku "Connection lost. Reconnecting…" (`js/connection.js`). Firebase se sam ponovo poveže kad se Wi-Fi vrati.

### i18n (internacionalizacija)
Skraćenica: između "i" i "n" ima 18 slova. Znači pripremiti aplikaciju za više jezika. Svi tekstovi su u `js/i18n/en.js` pod ključevima, npr. `"participant.join": "Join"`. U HTML-u piše samo `data-i18n="participant.join"`, a `applyTranslations()` u `js/i18n.js` upiše pravi tekst. Kad dodamo bosanski, napravićemo `js/i18n/bs.js` sa istim ključevima.

### `{count}` u tekstovima (parametri)
Tekst `"{count} joined"` ima rupu koja se popuni vrijednošću: `t("screen.participants", { count: 5 })` daje `"5 joined"`. Tako i jezici sa drugačijim redom riječi mogu staviti broj gdje im odgovara.

### `textContent` umjesto `innerHTML`
Kad prikazujemo nešto što je korisnik upisao (nadimak, tekst pitanja), koristimo `textContent`. Tako, ako neko upiše `<script>…`, to se prikaže kao običan tekst i ne može se izvršiti kao kod.

### QR kod
Kvadratni crtež koji mobitel kamerom pretvori u link. Biblioteka `qrcodejs` ga crta u browseru (`new QRCode(...)` u `js/screen.js`), pa ne trebamo nikakav vanjski servis.

### Viewport jedinice (`vh`, `vw`)
`1vh` = 1% visine ekrana, `1vw` = 1% širine. Projektor koristi ove jedinice (`css/screen.css`), pa se slova sama povećaju ili smanje prema veličini platna.

---

## Faza 2: Mjerenje prije/poslije

### Petlja aktivnosti
Cijela aplikacija radi u krug: facilitator pokrene aktivnost → učesnici odgovore → projektor prikaže. U bazi to izgleda ovako:
```
sessions
  └─ ROND
       ├─ current      { activityId: "-Nx7a…" }            ← šta je sad uključeno (piše samo facilitator)
       ├─ activities
       │    └─ -Nx7a…  { type: "measure", phase: "before", revealed: false, config: {…} }
       └─ responses
            └─ -Nx7a…
                 └─ before
                      └─ xyz789: [2, 4]                    ← odgovor vezan za uid, nikad za nadimak
```
Sva tri ekrana slušaju `current`. Kad se promijeni, svaki ekran nacrta svoju verziju iste aktivnosti. Kod je u `js/activity-loop.js`.

### Modul aktivnosti (plugin)
Svaki tip aktivnosti je jedan fajl u `js/activities/`, npr. `measure.js`. Fajl ima nekoliko funkcija sa uvijek istim imenima: `setup` (forma za facilitatora), `host` (dugmad dok traje), `participant` (forma na mobitelu), `screen` (prikaz na projektoru). Petlja ne zna ništa o mjerenju; samo pogleda `type` i pozove odgovarajući modul. Zato se novi tip doda kao novi fajl + jedan red u `js/activities/index.js`.

### Registar (`js/activities/index.js`)
Spisak svih tipova: `{ measure }`. Kao imenik: petlja u njemu pronađe modul po imenu tipa. Facilitatorov ekran iz istog spiska pravi dugmad "Start a new activity".

### Faza aktivnosti (`phase`)
Ista aktivnost može imati više dijelova. Mjerenje ima `before` i `after`, sa **istim** tvrdnjama jer su spremljene samo jednom (u `config`). Pravila baze dozvoljavaju odgovor samo u fazi koja je trenutno uključena: kad facilitator klikne "Start After", više niko ne može mijenjati "Before" odgovore.

### Reveal (`revealed`)
Polje `true/false` na aktivnosti. Projektor dok je `false` crta samo broj odgovora ("7 of 12 answered"), a kad postane `true` crta prosjeke "3.1 → 4.2". Facilitator ga mijenja dugmetom.

### Prosjek
Zbir svih odgovora podijeljen brojem odgovora. Npr. odgovori 2 i 4 → (2 + 4) / 2 = 3.0. Funkcija `stats()` u `measure.js`. Prikazujemo jednu decimalu (`toFixed(1)`).

### `push().key` (jedinstveni ID)
`push(ref(db, "…/activities")).key` napravi novi jedinstveni ključ (npr. `-Nx7aB3…`) bez upisivanja ičega. Ključevi su poredani po vremenu i dva uređaja nikad ne dobiju isti.

### Upis na više mjesta odjednom (multi-path update)
`update(ref(db, "sessions/ROND"), { "activities/abc": {…}, "current": {…} })` upiše oboje u jednom koraku: ili uspije sve, ili ništa. Tako projektor nikad ne vidi `current` koji pokazuje na aktivnost koja još ne postoji. Isto koristimo kad pravimo sesiju (meta + PIN zajedno).

### Host PIN i preuzimanje kontrole
Kad se napravi sesija, nastane i PIN od 6 cifara u `sessions/ROND/hostPin`. Čitati ga može samo trenutni facilitator (pravila baze), pa ga projektor i učesnici nikad ne mogu vidjeti. Preuzimanje sa drugog uređaja ide u dva koraka (`takeOverSession` u `js/session.js`):
1. Novi uređaj upiše svoj pokušaj u `pinAttempts/{svoj uid}`. Pravila to dozvoljavaju najviše jednom u 5 sekundi, da niko ne može brzo isprobati milion kombinacija.
2. Novi uređaj upiše svoj uid u `meta/hostUid`. Pravilo to dozvoljava samo ako je pokušaj jednak PIN-u.
Stari uređaj sluša `meta` i čim vidi tuđi uid, prikaže poruku da je kontrola prešla na drugi uređaj.

### Pravila mogu čitati ono što korisnik ne smije
Pravilo za `meta/hostUid` poredi pokušaj sa `hostPin`, iako novi uređaj `hostPin` ne smije čitati. Pravila se izvršavaju na serveru i vide cijelu bazu; korisnik dobije samo odgovor "da" ili "ne".

### `newData.parent()`
U pravilima, `newData` je podatak *kakav će biti* poslije upisa. `newData.parent()` je mjesto iznad njega. Primjer: pravilo za `current/activityId` provjerava `newData.parent().parent().child('activities')…` da aktivnost na koju pokazuje zaista postoji (i kad se pravi u istom upisu).

### Emulator (testiranje pravila)
Firebase ima "lažnu" bazu koja radi na računaru (Firebase Emulator). Na njoj smo isprobali pravila: npr. da učesnik ne može upisati 6 na skali od 1 do 5, da projektor ne može pročitati PIN, i da pogrešan PIN ne daje kontrolu. Prava baza se pri tome ne dira.

### Radio dugmad kao velika dugmad
Skala 1–5 na mobitelu su obična `<input type="radio">` polja (samo jedno se može izabrati), ali sakrivena; vidi se `<span>` pored njih, nacrtan kao veliko dugme. Tako je lako pritisnuti prstom, a čitači ekrana i dalje znaju da je to izbor (`css/app.css`, `.scale`).

### `el()` pomoćnik
`js/dom.js` pravi elemente iz JavaScripta: `el("p", { class: "hint", text: "Hello" })`. Tekst uvijek ide kao `textContent`, pa tvrdnja koju facilitator upiše nikad ne može postati kod na stranici.

---

## Faza 3: Brzo glasanje i tajmer

### Podatak koji ne postoji ne može procuriti
Nadimak je prije bio u bazi (`nicknames`), a čitati ga je mogao samo facilitator. Ali i facilitator je osoba iz sobe: da je vidio "Lion" i znao ko je Lion, mogao bi pokušati povezati osobu sa odgovorom. Zato nadimak sada **uopšte ne ide u bazu**. Ostaje u localStorage-u učesnikovog mobitela i služi samo za pozdrav "You're in, Lion!". U bazi je samo `members/xyz789: true`, pa facilitator vidi samo broj. Najsigurniji podatak je onaj koji nikad nije ni sačuvan.

### "Permission denied" kod slušača (listener)
Kad pravila baze nekome oduzmu pravo čitanja, Firebase prekine njegov slušač i javi grešku `PERMISSION_DENIED`. Na starom facilitatorovom uređaju se to desilo u trenutku preuzimanja PIN-om (slušač nadimaka je izgubio pravo), pa je izašlo "Something went wrong". Sada (`onError` u `js/host.js`): ako je greška "permission denied", stranica prvo provjeri ko je sad vlasnik sesije. Ako je to drugi uređaj, mirno ugasi sve slušače i pokaže samo poruku o preuzimanju.

### Jednina i množina (`Intl.PluralRules`)
"1 answers" je greška: na engleskom je 1 answer, 2 answers. Tekst sa brojem sada ima dva oblika:
```js
"poll.votes": { one: "{count} vote", other: "{count} votes" }
```
`t("poll.votes", { count: 1 })` → "1 vote". Browser ima ugrađeni `Intl.PluralRules` koji zna pravila svakog jezika. To će trebati kod prevoda: bosanski ima tri oblika (1 glas, 2 glasa, 5 glasova), a `Intl.PluralRules("bs")` ih zna razlikovati ("one", "few", "other"). Vidi `js/i18n.js`.

### Stanja (state machine)
Svako pitanje u glasanju ima tačno jedno od stanja: `statement` → `voting` → `results` (+ posebno stanje `compare`). Stanje je jedno polje u bazi (`activities/{id}/state`) i svi ekrani crtaju prema njemu. Dugme Next samo pomjeri stanje za jedan korak. Prednost: nikad ne može biti "pola otvoreno"; ako mobitel osvježi stranicu, pročita stanje i nacrta tačno ono što treba.

### Lista pitanja i Next / Back
Cijela lista je jedan dugi red koraka: pitanje 1 izjava, pitanje 1 glasanje, pitanje 1 rezultati, pitanje 2 izjava… Next ide jedan korak naprijed, Back jedan nazad (`nextStep` i `previousStep` u `js/activities/poll.js`). Koje pitanje je uključeno piše u `phase` ("q0" = prvo pitanje, "q1" = drugo…), pa svako pitanje ima svoje glasove: `responses/{id}/q1/{uid}: 2`.

### Pravila koja gledaju drugo polje
Glas se smije upisati samo dok je `state` jednak `"voting"`:
```
root.child('sessions').child($code).child('activities').child($aid).child('state').val() === 'voting'
```
Kad facilitator klikne "Reveal", baza sama odbija nove glasove, bez obzira šta radi kod na mobitelu.

### Glas kao broj (indeks)
U bazu ne ide tekst opcije ("winked"), nego njen redni broj, počevši od nule: "believed" = 0, "winked" = 1. Kraće je, pravila lako provjere da je broj od 0 do 5, a ista opcija ostaje ista i kad se tekst kasnije prevede na drugi jezik.

### Procenat i zaokruživanje
Procenat = glasovi za opciju / svi glasovi × 100, zaokruženo na cijeli broj (`Math.round`). Zbog zaokruživanja zbir ponekad bude 99% ili 101%; to je normalno.

### Oznaka (tag) i ekran Compare
Pitanje može imati oznaku, npr. "Win" ili "Dialogue". Compare sabere glasove svih pitanja sa istom oznakom i pokaže koliki dio je otišao na izabranu opciju: "Win: 8% moved · Dialogue: 55% moved". Opcije se porede po tekstu, bez obzira na velika/mala slova (`key()` u `poll.js`).

### Šablon (template) sa kodom
Lista pitanja se može sačuvati u `templates/KXPTRM`. Kod od 6 slova radi kao ključ: ko zna kod, može učitati šablon na bilo kojem uređaju i u bilo kojoj sesiji. Pravila dozvoljavaju čitanje jednog šablona po kodu, ali **ne** spiska svih šablona, pa učesnik ne može "listati" pitanja koja dolaze. Mijenjati šablon može samo uređaj koji ga je napravio (`ownerUid`). Vidi `js/templates.js`.

### Serversko vrijeme i tajmer
Sat na svakom uređaju može kasniti ili žuriti. Zato tajmer u bazi ima samo dvije stvari:
```
timer: { startedAt: 1761552000000, duration: 90 }
```
`startedAt` upiše **server** (`serverTimestamp()`), ne mobitel. Svaki ekran sam računa: kraj = `startedAt + 90 s`; preostalo = kraj − "sada na serveru". "Sada na serveru" dobijemo iz `.info/serverTimeOffset`: Firebase izmjeri razliku između sata ovog uređaja i sata servera (npr. +2300 ms), pa `serverNow() = Date.now() + razlika` (`js/firebase.js`). Niko ne mora odbrojavati i slati svake sekunde, pa tajmer ostaje tačan na projektoru i kad facilitatorov mobitel zaspi.

### `setInterval` i `visibilitychange`
`setInterval(draw, 200)` ponovo nacrta tajmer pet puta u sekundi. Kad je stranica u pozadini (zaključan ekran), browser usporava ili pauzira takve funkcije; zato slušamo i `visibilitychange` (stranica ponovo vidljiva) i odmah ponovo izračunamo. Pošto se uvijek računa iz serverskog vremena, ništa se ne "izgubi" dok je uređaj spavao.

### CSS animacija (`@keyframes`)
Zadnjih 10 sekundi tajmer postane dvostruko veći, crven i "pulsira": `@keyframes timer-pulse` malo ga poveća i vrati, svake sekunde (`css/screen.css`). Ko u sistemu traži manje pokreta (`prefers-reduced-motion`), dobije crveni tajmer bez pulsiranja.

### `position: fixed`
Tajmer na projektoru je "zakucan" u gornji desni ugao (`position: fixed`), iznad bilo čega drugog (`z-index`). Zato se vidi preko QR koda i preko svake aktivnosti, a aktivnosti ne moraju ništa znati o njemu.

