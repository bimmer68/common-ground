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


---

## Faze 4 i 5: Oblak riječi, zid i moderisani zid

### Zajednička osnova (jedan dio koda za tri aktivnosti)
Oblak riječi, zid i moderisani zid na mobitelu rade isto: učesnik napiše kratak tekst, može poslati 1–3 teksta, i može ih urediti ili obrisati dok je pisanje otvoreno. Zato je taj dio napisan **jednom**:
- `js/text-store.js` – sve što ide u bazu i iz baze (dodaj, uredi, obriši, odobri, glasaj, pogađaj).
- `js/activities/text-base.js` – forma na mobitelu (`textWriter`), normalizacija riječi, uklapanje teksta u projektor.

Tri modula (`wordcloud.js`, `wall.js`, `moderated-wall.js`) se razlikuju samo po tome **kako prikazuju** tekstove. Moderisani zid još i koristi dijelove zida (`import { wallScreen, … } from "./wall.js"`), pa se ništa ne piše dvaput.

### Tekst bez autora
U bazi tekst izgleda ovako:
```
posts/-Nx7a…/main/-Ny2b…   { text: "Asking questions", group: true, at: 1761552000000 }
```
Nema uid-a, nema nadimka, nema jezika. Jedina veza između osobe i teksta je:
```
mine/-Nx7a…/main/xyz789/0: "-Ny2b…"     ← "slot 0 je moj tekst"
```
a `mine/…/xyz789` po pravilima baze smije čitati **samo** uid `xyz789`. Ni projektor ni facilitator ne mogu saznati ko je šta napisao, čak ni kad otvore alate za programere u browseru.

### Slotovi (kako baza broji "najviše 3 po osobi")
Pravila baze ne znaju brojati ("koliko tekstova ima ova osoba?"). Zato svaka osoba ima tri "ladice": `0`, `1`, `2`. Pravilo kaže: ladica `1` je dozvoljena samo ako je `perPerson` ≥ 2, ladica `2` samo ako je ≥ 3. Ladica se popuni jednom i isprazni jednom (kad se tekst briše), pa niko ne može imati više tekstova nego ladica. Isto važi za glasove na zidu (`votes/{id}/{uid}/0…4`).

### Jedan upis za dvije stvari
Kad učesnik pošalje tekst, u **jednom** koraku se upišu i tekst i ladica:
```js
update(ref(db, "sessions/ROND"), {
  "mine/abc/main/xyz789/0": "-Ny2b…",
  "posts/abc/main/-Ny2b…": { text: "Hello", at: serverTimestamp() }
});
```
Pravilo za tekst provjerava da ladica **poslije** upisa pokazuje na taj tekst (`newData`). Ili uspije oboje, ili ništa.

### Normalizacija riječi
Da bi "Trust!", " trust " i "TRUST" bila ista riječ u oblaku, svaki odgovor se "očisti": mala slova, bez razmaka na krajevima, bez interpunkcije na kraju (`normalizeWord` u `text-base.js`). Regularni izraz `/[\s\p{P}]+$/u` znači "sve razmake i znakove interpunkcije na kraju". `\p{P}` hvata interpunkciju iz svih pisama, ne samo engleskog.

### Veličina riječi i kvadratni korijen
Riječ koju je napisalo više ljudi je veća. Ali kad bi veličina rasla ravno sa brojem (10 puta → 10 puta veće), jedna česta riječ bi napravila sve ostale sitnim. Zato koristimo kvadratni korijen: `Math.sqrt(4 / 16) = 0.5`, pa riječ sa 4 glasa ima pola veličine riječi sa 16, a ne četvrtinu.

### Ključ u bazi ne smije imati tačku
Firebase ključevi ne smiju sadržavati `. # $ [ ] /`. Kad facilitator ukloni riječ "u.s.a.", upisujemo je kao ključ `u%2Es%2Ea%2E` (`wordKey` koristi `encodeURIComponent`).

### Uklapanje u ekran (`fitToBox`)
Na zidu može biti 1 ili 45 kartica. Projektor prvo nacrta sve u punoj veličini, pa smanjuje (CSS varijabla `--fit`: 1 → 0.9 → 0.81 …) dok sve ne stane. U CSS-u piše npr. `font-size: calc(var(--fit) * 6vh)`. Pri promjeni veličine prozora ponovo se računa.

### Moderisani zid: dvije odvojene "kutije"
Pravilo baze ne može reći "čitaj samo odobrene tekstove iz ove liste" – ko smije čitati listu, vidi sve u njoj. Zato su neodobreni i odobreni tekstovi na **dva različita mjesta**:
```
inbox/{id}/main/{pid}   čeka odobrenje – čita SAMO facilitator (i autor svoj tekst)
posts/{id}/main/{pid}   odobreno – čita svako (projektor)
```
Facilitator odobrava tako što kopira tekst iz `inbox` u `posts`. Pravilo dozvoljava tu kopiju samo ako je tekst **tačno isti** kao u inboxu, i bez skrivene oznake.

### Skrivena oznaka i "Reveal" koji ne može lagati
U igri "Ko je ovo napisao?" autor tajno bira oznaku ("I believe this" / "I don't believe this"). Oznaka je samo u `inbox`, nikad u `posts`, pa je ostali ne mogu pročitati prije otkrivanja. Na Reveal facilitator upiše `activities/{id}/answer`, a pravilo prihvata samo vrijednost koja je **jednaka** oznaci iz inboxa. Autor ne može pogađati svoj tekst (pravilo provjerava njegove ladice), a njegov mobitel mu samo kaže "ovo je tvoj tekst".

### Testiranje uživo sa emulatorom i headless browserom
Za ovu fazu testirali smo i pravila (82 provjere na Firebase emulatoru: npr. projektor ne može pročitati `inbox`, učesnik ne može urediti tuđu karticu) i cijelu aplikaciju: "headless" Chromium (browser bez prozora) je otvorio četiri ekrana (facilitator, projektor, dva učesnika), kliktao i provjeravao šta se vidi na projektoru.

### Veliki tajmer
Tajmer u bazi sada ima i `big: true/false`. Na projektoru to samo doda CSS klasu `timer-big`, koja tajmer razvuče preko cijelog ekrana (`position: fixed; inset: 0`). Facilitator ga može uključiti i dok tajmer već teče.

---

## Popravka, Common Ground (Faza 8) i izvještaj (Faza 6)

### Lista u listi (`flat` i `flat(Infinity)`)
Pomoćnik `el()` prima djecu i kao listu: `el("div", {}, [a, b])`. Prije je koristio `children.flat()`, koji "spljošti" samo **jedan** nivo:
```js
[[label1, input1], [label2, input2]].flat()   // → [label1, input1], [label2, input2]  (još uvijek liste!)
```
Kad browser dobije listu tamo gdje očekuje element, pretvori je u tekst: `"[object HTMLLabelElement],[object HTMLInputElement]"`. Upravo to se vidjelo kod "Hidden label game". Sada `el()` i `fill()` koriste `flat(Infinity)`: spljošti se svaki nivo, koliko god lista bilo jedna u drugoj (`js/dom.js`).

### Izračunato, a ne sačuvano
Tabla "Common Ground" nigdje nije upisana u bazu. Svaki ekran je sam **izračuna** iz glasova i praga (`statementsOf` u `js/activities/common-ground.js`): "ova verzija ima 9 od 11 glasova *I can sign* = 82% ≥ 80% → na tabli je". Prednost: kad facilitator promijeni prag sa 80% na 75%, tabla i metar se odmah promijene, bez ikakvog "prepisivanja" table. Podatak koji se izračuna ne može biti u neskladu sa glasovima.

### Verzije i historija
Tvrdnja ima verzije: `v0` je tekst kako je predložen, `v1`, `v2`… su facilitatorove nove verzije:
```
activities/-Nx7a…/versions/-Ny2b…   { v0: "Every person deserves to feel safe.", v1: "… at home and on the street." }
signs/-Nx7a…/-Ny2b…/v0/xyz789: 1     ← glas za staru verziju ostaje
signs/-Nx7a…/-Ny2b…/v1/xyz789: 0     ← nova verzija ima svoje glasove
```
Nova verzija se nikad ne upisuje preko stare, pa se uvijek vidi "v1: 33% → v2: 100%".

### "Glasačka kutija" (`ballot`) u pravilima
`activities/{id}/ballot = { pid, v }` kaže o kojoj tvrdnji i verziji se sad glasa. Pravilo za glas provjerava da se glasa **baš** o toj verziji i samo dok je `state === "voting"`. Kad facilitator zatvori glasanje ili pusti novu verziju, baza sama odbija glasove za staru.

### Pravilo koje traži da nešto postoji (`isString()` na drugom mjestu)
`ballot` je dozvoljen samo ako tekst te verzije postoji:
`newData.parent().child('versions').child(pid).child(v).isString()`. Tako projektor nikad ne može dobiti "glasaj o tekstu koji ne postoji". U istom upisu facilitator može napraviti i verziju i ballot (`newData` vidi oba).

### Prag i zaokruživanje
Procenat "I can sign" se računa od onih koji su **glasali** za tu verziju (ne od svih u sobi) i zaokružuje se na cijeli broj, isti broj koji projektor prikazuje. Tako se nikad ne desi da projektor kaže "80%", a tvrdnja ne prođe prag od 80%.

### Polje za kucanje koje se ne smije ponovo crtati
Facilitatorov ekran se ponovo nacrta sa svakim novim glasom. Kad bi i polje "New version" bilo nacrtano ponovo, tekst koji facilitator kuca bi nestao i tastatura bi se zatvorila. Zato to polje ima svoju "kutiju" (`reviseBox`) koja se crta ponovo **samo** kad se promijeni tvrdnja ili verzija na glasanju.

### Izvještaj: svaki modul piše svoj dio
Svaki modul aktivnosti sada može imati i funkciju `report()`, pored `host`, `participant` i `screen`. Stranica `report.html` (`js/report.js`) samo prođe kroz registar (`js/activities/index.js`) i za svaku aktivnost pozove njen `report()`. Novi tip aktivnosti dobije svoj dio izvještaja dodavanjem jedne funkcije u svoj fajl.

### Snimak, ne uživo (`get` umjesto `onValue`)
Projektor sluša bazu uživo (`onValue`). Izvještaj umjesto toga jednom pročita sve što treba (`get`, u `js/report-store.js`) – to je snimak stanja u trenutku otvaranja. Čita samo javne dijelove: nikad `inbox` (neodobreni tekstovi) ni `mine` (ko je šta napisao).

### Štampanje i PDF (`@media print`, `@page`)
U `css/report.css` dio `@media print { … }` važi samo kad se stranica štampa: dugme "Print" nestane, slova se prilagode papiru. `@page { size: A4; margin: … }` određuje veličinu papira i margine. `break-inside: avoid` kaže "ne sijeci ovo pitanje na dvije stranice". PDF se dobije u prozoru za štampu: odredište "Save as PDF". `print-color-adjust: exact` čuva boju stubića (browser inače štampa bez pozadinskih boja).

### Pristup izvještaju
`report.html?s=ROND` provjeri da li je uid ovog browsera jednak `meta/hostUid`. Ako nije, prikaže samo poruku. Novi tab u istom browseru ima isti anonimni uid, pa ga facilitator otvara dugmetom "Open report" sa svog ekrana.
