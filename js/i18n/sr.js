// Srpski (latinica) – samo tekstovi koje vidi učesnik na mobitelu.
// Ključevi su isti kao u en.js. Tekst koji ovdje nedostaje prikazuje se na engleskom.
export default {
  // Shared
  "common.loading": "Učitavanje…",
  "common.offline": "Veza je prekinuta. Ponovo se povezujem…",
  "common.error": "Nešto nije u redu. Osveži stranicu.",
  "common.signInError": "Povezivanje nije uspelo. Proveri internet vezu i osveži stranicu.",
  "common.cancel": "Otkaži",
  "activity.unknown": "Ova aktivnost ne može da se prikaže ovde. Osveži stranicu.",

  // Participant (index.html)
  "participant.title": "Uđi u sesiju",
  "participant.codeLabel": "Kod sesije",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "Nadimak",
  "participant.nicknameHint": "Ostaje samo na tvom telefonu. Niko drugi ga ne vidi, ni facilitator.",
  "participant.nicknamePlaceholder": "Tvoj nadimak",
  "participant.join": "Uđi",
  "participant.joining": "Ulazim…",
  "participant.errorCode": "Kod ima 4 slova.",
  "participant.errorNickname": "Upiši nadimak (najviše {max} znakova).",
  "participant.errorNotFound": "Nema sesije sa ovim kodom.",
  "participant.waitingTitle": "Unutra si!",
  "participant.waitingTitleNamed": "Unutra si, {nickname}!",
  "participant.waitingText": "Sačekaj da facilitator pokrene sledeću aktivnost.",
  "participant.joinedAs": "Sesija {code}",
  "participant.language": "Jezik",
  "participant.languageHint": "Tvoj izbor ostaje samo na ovom telefonu.",

  // Measurement
  "measure.phase.before": "Pre",
  "measure.phase.after": "Posle",
  "measure.participantTitle": "Koliko se slažeš?",
  "measure.scaleLow": "1 = Uopšte se ne slažem",
  "measure.scaleHigh": "5 = Potpuno se slažem",
  "measure.submit": "Pošalji",
  "measure.saving": "Šaljem…",
  "measure.saveError": "Slanje nije uspelo. Pokušaj ponovo.",
  "measure.thanksTitle": "Hvala!",
  "measure.thanksText": "Tvoji odgovori su sačuvani. Niko ne vidi ko je šta odgovorio.",
  "measure.change": "Promeni odgovore",

  // Quick poll
  "poll.questionOf": "Pitanje {n} od {total}",
  "poll.yes": "Da",
  "poll.no": "Ne",
  "poll.true": "Tačno",
  "poll.false": "Netačno",
  "poll.waitVoting": "Pogledaj ekran. Glasanje uskoro počinje.",
  "poll.tapToVote": "Dodirni svoj odgovor. Možeš da ga promeniš dok je glasanje otvoreno.",
  "poll.voteSaved": "Sačuvano. Možeš da promeniš dok je glasanje otvoreno. Niko ne vidi ko je kako glasao.",
  "poll.saveError": "Slanje nije uspelo. Dodirni ponovo.",
  "poll.closed": "Glasanje je zatvoreno. Pogledaj ekran.",
  "poll.yourVote": "Tvoj glas: {option}",
  "poll.ratingLow": "1 = Nimalo",
  "poll.ratingHigh": "5 = Potpuno",

  // Text answers
  "text.writeTitle": "Tvoj odgovor",
  "text.anotherTitle": "Još jedan odgovor",
  "text.editTitle": "Uredi svoj odgovor",
  "text.chars": "{count} / {max}",
  "text.send": "Pošalji",
  "text.save": "Sačuvaj izmene",
  "text.sending": "Šaljem…",
  "text.edit": "Uredi",
  "text.delete": "Obriši",
  "text.confirmDelete": "Obrisati ovaj odgovor?",
  "text.left": "Možeš da pošalješ još: {count}.",
  "text.writingClosed": "Pisanje je zatvoreno. Pogledaj ekran.",
  "text.errorLength": "Napiši nešto (najviše {max} znakova).",
  "text.errorLabel": "Izaberi jednu od dve oznake.",
  "text.saveError": "Slanje nije uspelo. Pokušaj ponovo.",
  "text.group": "Grupa",
  "text.groupCheck": "Pišemo kao grupa (jedan telefon za celu grupu)",
  "text.labelLegend": "Tajno izaberi jednu oznaku",
  "text.labelHint": "Kasnije će ostali pogađati tvoj izbor. Tvoje ime se nikad ne prikazuje.",
  "text.yourLabel": "Tvoj tajni izbor: {label}",

  // Word cloud
  "cloud.promptOf": "Zadatak {n} od {total}",
  "cloud.lookAtScreen": "Pogledaj ekran.",

  // Wall
  "wall.votesLeft": "Preostalo glasova: {count} od {max}",
  "wall.noCards": "Još nema kartica.",
  "wall.vote": "Glasaj",
  "wall.voted": "Glasano ✓",
  "wall.votingClosed": "Glasanje je zatvoreno. Pogledaj ekran.",

  // Moderated wall
  "modwall.statusPending": "Čeka facilitatora",
  "modwall.statusShown": "Na ekranu",
  "modwall.statusHidden": "Nije prikazano na ekranu",
  "modwall.guessTitle": "Ko je ovo napisao?",
  "modwall.guessQuestion": "Koju oznaku je autor izabrao?",
  "modwall.guessMine": "Ovo je tvoj tekst. Ostali pogađaju – nemoj da se odaš!",
  "modwall.answerWas": "Izbor autora: {label}",

  // Common Ground
  "ground.writeHint": "Tvoj predlog ide prvo facilitatoru. Niko ne vidi ko ga je napisao.",
  "ground.canYouSign": "Možeš li da potpišeš ovo?",
  "ground.newVersionNote": "Ovo je nova verzija tvrdnje. Glasaj ponovo.",
  "ground.lookAtBoard": "Pogledaj ekran: ovo je ono što cela grupa može da potpiše.",
  "ground.choice.sign": "Mogu da potpišem",
  "ground.choice.change": "Uz izmenu",
  "ground.choice.cant": "Ne mogu da potpišem",
  "ground.amendLabel": "Tvoja izmena (nije obavezno)",
  "ground.amendHint": "Napiši kako bi tvrdnju trebalo promeniti da bi mogao/la da je potpišeš. Vidi je samo facilitator, bez tvog imena.",
  "ground.amendSend": "Pošalji izmenu",
  "ground.amendSaved": "Poslato facilitatoru. Možeš da je menjaš dok je glasanje otvoreno.",
  "ground.amendConfirmDelete": "Obrisati tvoj predlog izmene?"
};
