// Azərbaycanca – only the texts a participant sees on the phone.
// Same keys as en.js. A text missing here is shown in English.
export default {
  // Shared
  "common.loading": "Yüklənir…",
  "common.offline": "Bağlantı kəsildi. Yenidən qoşulur…",
  "common.error": "Nəsə səhv getdi. Səhifəni yenilə.",
  "common.signInError": "Qoşulmaq mümkün olmadı. İnternet bağlantısını yoxla və səhifəni yenilə.",
  "common.cancel": "Ləğv et",
  "activity.unknown": "Bu fəaliyyəti burada göstərmək mümkün deyil. Səhifəni yenilə.",

  // Participant (index.html)
  "participant.title": "Sessiyaya qoşul",
  "participant.codeLabel": "Sessiya kodu",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "Ləqəb",
  "participant.nicknameHint": "O, yalnız sənin telefonunda qalır. Onu heç kim, hətta fasilitator da görmür.",
  "participant.nicknamePlaceholder": "Sənin ləqəbin",
  "participant.join": "Qoşul",
  "participant.joining": "Qoşulur…",
  "participant.errorCode": "Kod 4 hərfdən ibarətdir.",
  "participant.errorNickname": "Ləqəb yaz (ən çox {max} simvol).",
  "participant.errorNotFound": "Bu kodla sessiya yoxdur.",
  "participant.waitingTitle": "Xoş gəldin!",
  "participant.waitingTitleNamed": "Xoş gəldin, {nickname}!",
  "participant.waitingText": "Fasilitatorun növbəti fəaliyyəti başlatmasını gözlə.",
  "participant.joinedAs": "Sessiya {code}",
  "participant.language": "Dil",
  "participant.languageHint": "Seçimin yalnız bu telefonda qalır.",

  // Measurement
  "measure.phase.before": "Əvvəl",
  "measure.phase.after": "Sonra",
  "measure.participantTitle": "Nə dərəcədə razısan?",
  "measure.scaleLow": "1 = Heç razı deyiləm",
  "measure.scaleHigh": "5 = Tamamilə razıyam",
  "measure.submit": "Göndər",
  "measure.saving": "Göndərilir…",
  "measure.saveError": "Göndərmək mümkün olmadı. Yenidən cəhd et.",
  "measure.thanksTitle": "Təşəkkürlər!",
  "measure.thanksText": "Cavabların yadda saxlanıldı. Kimin nə cavab verdiyini heç kim görmür.",
  "measure.change": "Cavablarımı dəyiş",

  // Quick poll
  "poll.questionOf": "Sual {n} / {total}",
  "poll.yes": "Bəli",
  "poll.no": "Xeyr",
  "poll.true": "Doğru",
  "poll.false": "Yanlış",
  "poll.waitVoting": "Ekrana bax. Səsvermə tezliklə açılacaq.",
  "poll.tapToVote": "Cavabına toxun. Səsvermə açıq olduqca onu dəyişə bilərsən.",
  "poll.voteSaved": "Yadda saxlanıldı. Səsvermə açıq olduqca dəyişə bilərsən. Kimin necə səs verdiyini heç kim görmür.",
  "poll.saveError": "Göndərmək mümkün olmadı. Yenidən toxun.",
  "poll.closed": "Səsvermə bağlıdır. Ekrana bax.",
  "poll.yourVote": "Sənin səsin: {option}",
  "poll.ratingLow": "1 = Heç",
  "poll.ratingHigh": "5 = Tamamilə",

  // Text answers
  "text.writeTitle": "Sənin cavabın",
  "text.anotherTitle": "Daha bir cavab",
  "text.editTitle": "Cavabını düzəlt",
  "text.chars": "{count} / {max}",
  "text.send": "Göndər",
  "text.save": "Dəyişiklikləri saxla",
  "text.sending": "Göndərilir…",
  "text.edit": "Düzəlt",
  "text.delete": "Sil",
  "text.confirmDelete": "Bu cavab silinsin?",
  "text.left": "Daha göndərə bilərsən: {count}.",
  "text.writingClosed": "Yazmaq bağlıdır. Ekrana bax.",
  "text.errorLength": "Nəsə yaz (ən çox {max} simvol).",
  "text.errorLabel": "İki etiketdən birini seç.",
  "text.saveError": "Göndərmək mümkün olmadı. Yenidən cəhd et.",
  "text.group": "Qrup",
  "text.groupCheck": "Qrup olaraq yazırıq (bütün qrup üçün bir telefon)",
  "text.labelLegend": "Gizlicə bir etiket seç",
  "text.labelHint": "Sonra digərləri hansını seçdiyini təxmin edəcək. Adın heç vaxt göstərilmir.",
  "text.yourLabel": "Gizli seçimin: {label}",

  // Word cloud
  "cloud.promptOf": "Tapşırıq {n} / {total}",
  "cloud.lookAtScreen": "Ekrana bax.",

  // Wall
  "wall.votesLeft": "Qalan səslər: {count} / {max}",
  "wall.noCards": "Hələ kart yoxdur.",
  "wall.vote": "Səs ver",
  "wall.voted": "Səs verildi ✓",
  "wall.votingClosed": "Səsvermə bağlıdır. Ekrana bax.",

  // Moderated wall
  "modwall.statusPending": "Fasilitatoru gözləyir",
  "modwall.statusShown": "Ekranda",
  "modwall.statusHidden": "Ekranda göstərilmir",
  "modwall.guessTitle": "Bunu kim yazıb?",
  "modwall.guessQuestion": "Müəllif hansı etiketi seçib?",
  "modwall.guessMine": "Bu sənin mətnindir. Digərləri təxmin edir – özünü biruzə vermə!",
  "modwall.answerWas": "Müəllifin seçimi: {label}",

  // Common Ground
  "ground.writeHint": "Təklifin əvvəlcə fasilitatora gedir. Onu kimin yazdığını heç kim görmür.",
  "ground.canYouSign": "Bunun altından imza ata bilərsənmi?",
  "ground.newVersionNote": "Bu, fikrin yeni variantıdır. Yenidən səs ver.",
  "ground.lookAtBoard": "Ekrana bax: bütün qrupun imza ata biləcəyi budur.",
  "ground.choice.sign": "İmza ata bilərəm",
  "ground.choice.change": "Dəyişikliklə",
  "ground.choice.cant": "İmza ata bilmərəm",
  "ground.amendLabel": "Sizin dəyişikliyiniz (istəyə bağlı)",
  "ground.amendHint": "Bəyanatı imzalaya bilməyiniz üçün onun necə dəyişməli olduğunu yazın. Onu yalnız fasilitator görür, adınız olmadan.",
  "ground.amendSend": "Dəyişikliyi göndər",
  "ground.amendSaved": "Fasilitatora göndərildi. Səsvermə açıq olduqca onu dəyişə bilərsiniz.",
  "ground.amendConfirmDelete": "Təklif etdiyiniz dəyişiklik silinsin?"
};
