# Common Ground

Aplikacija za interaktivne radionice. Učesnici odgovaraju na mobitelima, rezultati se prikazuju na projektoru, a facilitator upravlja sesijom sa svog mobitela.

Prvi put se koristi na radionicama u Rondine World Houseu (Italija), 27.–30. oktobra 2026. Grupe od 10–15 mladih ljudi iz zemalja u konfliktu. Radi se na engleskom.

---

## Osnovna ideja: jedna petlja

Cijela aplikacija je jedna petlja koja se ponavlja:

1. Facilitator na svom mobitelu pokrene aktivnost (pitanje, glasanje, zadatak).
2. Učesnici odgovore na svojim mobitelima.
3. Projektor prikaže odgovore na način koji odgovara toj aktivnosti.

Svaki "alat" (glasanje, oblak riječi, zid...) je samo drugačiji tip aktivnosti u istoj petlji. Kod mora biti organizovan tako da se novi tip aktivnosti dodaje bez mijenjanja ostatka aplikacije.

## Tri ekrana

| Fajl | Ko ga koristi | Opis |
|---|---|---|
| `index.html` | Učesnici, na mobitelu | Ulaz sa kodom sesije i nadimkom, pa forma za trenutnu aktivnost |
| `screen.html` | Projektor, na laptopu | Velika slova, čitljivo sa 8 metara, tamna pozadina, visok kontrast. Bez ikakvih kontrola |
| `host.html` | Facilitator, na mobitelu | Pravljenje sesije, pokretanje aktivnosti, otkrivanje rezultata, odobravanje tekstova |

Projektor i facilitator su **namjerno odvojeni**: projektor prikazuje laptop, a sve što facilitator vidi prije odobravanja ne smije se pojaviti na projektoru.

---

## Tehnička pravila (obavezno)

- Čisti HTML, CSS i JavaScript, bez build koraka i bez frameworka. Objava na **GitHub Pages**.
- **Firebase Realtime Database** za dijeljenje podataka uživo i **Firebase Anonymous Authentication** za anonimni ulaz. Firebase se učitava sa zvaničnog CDN-a (gstatic.com) kao ES moduli, uz fiksnu verziju.
- Firebase config je u `js/firebase-config.js` (vrijednosti ispod). Config nije tajna i smije biti u javnom repou. Zaštitu daju pravila baze.
- Pravila baze se čuvaju u `database.rules.json`. Vlasnik projekta ih ručno kopira u Firebase konzolu (Realtime Database → Rules). **U svakom PR-u koji mijenja pravila napiši tačno šta treba kopirati i gdje.**
- QR kod se pravi u browseru, bibliotekom sa cdnjs.cloudflare.com.
- Svi tekstovi interfejsa su u jednom fajlu (`js/i18n/en.js`), nikad direktno u HTML-u ili logici, jer se kasnije dodaje 13 jezika.
- Aplikacija mora preživjeti realnu sobu: mobitel koji se zaključa, slab Wi-Fi, osvježena stranica. Nakon osvježavanja učesnik i facilitator ostaju u istoj sesiji sa istim identitetom.

## Firebase config

```js
// Vlasnik projekta ovdje lijepi svoj firebaseConfig iz Firebase konzole
```

## Anonimnost (obavezno, bez izuzetaka)

- Učesnik ulazi samo sa nadimkom. Nema imena, emaila ni naloga.
- **Nadimak se nikad ne prikazuje na projektoru.** Služi samo facilitatoru da vidi ko je ušao.
- Izbor jezika se nigdje ne prikazuje (u grupi su strane u sukobu, a jezik može otkriti osobu).
- Odgovori na projektoru su uvijek bez autora.
- U bazi se odgovori vežu za anonimni Firebase uid, nikad za nadimak.

## Sesija

- Facilitator na `host.html` napravi sesiju i dobije kod od 4 slova (npr. ROND).
- `screen.html?s=ROND` prikazuje veliki QR kod i kod sesije, plus broj učesnika koji su ušli.
- QR vodi na `index.html?s=ROND`.
- Samo facilitator koji je napravio sesiju može njome upravljati (provjera preko uid-a u pravilima baze).
- Učesnik može pisati samo svoje odgovore. Niko ne može mijenjati tuđe.

## Tipovi aktivnosti

Za svaku aktivnost facilitator bira da li se rezultati vide odmah ili tek kad klikne **Reveal**.

1. **Mjerenje (prije/poslije):** ista pitanja na skali 1–5 na početku i na kraju radionice. Rezultati se ne prikazuju dok facilitator ne otkrije pomak ("Before: 3,1 → After: 4,2").
2. **Brzo glasanje:** jedan alat sa više tipova pitanja: da/ne, izbor između opcija, tačno/netačno, ocjena 1–5. Projektor prikazuje stubiće.
3. **Oblak riječi:** kratki odgovori, a češće riječi su veće. Riječi se normalizuju (mala slova, bez razmaka na krajevima).
4. **Zid sa glasanjem:** učesnici šalju kratak tekst, tekstovi se pojavljuju na projektoru, svi mogu glasati.
5. **Moderisani zid:** isto kao zid, ali tekst ide prvo samo na facilitatorov ekran. Na projektor ide tek kad ga facilitator odobri.

Dodatno: **tajmer na projektoru** (npr. 90 ili 120 sekundi) koji facilitator pokreće.

## Izvještaj

Na kraju sesije facilitator otvara stranicu za izvještaj koja se može odštampati ili sačuvati kao PDF: broj učesnika, rezultati mjerenja prije/poslije, rezultati glasanja i tekstovi sa zidova. Bez nadimaka i bez jezika.

## Jezici (zadnja faza)

Učesnik bira jezik interfejsa na svom mobitelu. Projektor i facilitator su uvijek na engleskom. Odgovori se pišu na engleskom.

Jezici: engleski, bosanski, srpski, italijanski, ruski, ukrajinski, azerbejdžanski, gruzijski, armenski, bambara, albanski, arapski, hebrejski. Arapski i hebrejski se pišu zdesna nalijevo, pa raspored mora pratiti `dir="rtl"`.

---

## Kako radimo (obavezno za svaki zadatak)

1. Jedan zadatak = jedna faza iz plana ispod. Ne radi ništa izvan zadatka.
2. U opisu pull requesta objasni **na jednostavnom bosanskom** šta si promijenio, zašto, i koji fajl radi šta. Vlasnik projekta nije programer i uči iz svakog PR-a.
3. U svakom PR-u napiši sekciju **"Kako testirati"**: tačni koraci za test na laptopu i mobitelu (npr. tri taba za tri ekrana).
4. Ažuriraj `LEARNING.md` novim pojmovima iz zadatka, sa kratkim objašnjenjem i primjerom iz ovog projekta.
5. Kad neko pravilo nije jasno, napravi razumnu pretpostavku i navedi je u opisu PR-a.

## Plan po fazama

1. **Osnova:** tri ekrana, pravljenje sesije, kod i QR, ulaz sa nadimkom, broj učesnika uživo, anonimni ulaz, pravila baze, preživljavanje osvježavanja. Kreiraj i `LEARNING.md`.
2. **Mjerenje prije/poslije** sa otkrivanjem pomaka.
3. **Brzo glasanje** (svi tipovi) i **tajmer**.
4. **Oblak riječi.**
5. **Zid sa glasanjem i moderisani zid.**
6. **Izvještaj.**
7. **Jezici** (13 jezika, RTL).
8. **Metar zajedničkog tla** (opcionalno): vizualizacija zida gdje tvrdnje sa preko 80% glasova "can sign" pune metar.
