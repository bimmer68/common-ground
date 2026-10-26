// Српски (ћирилица) – само текстови које види учесник на мобилном.
// Isti tekstovi kao sr.js (latinica), prebačeni na ćirilicu. Kod sesije
// ostaje latinicom (ABCD), jer se tako i upisuje. Ključevi su isti kao u en.js.
export default {
  // Shared
  "common.loading": "Учитавање…",
  "common.offline": "Веза је прекинута. Поново се повезујем…",
  "common.error": "Нешто није у реду. Освежи страницу.",
  "common.signInError": "Повезивање није успело. Провери интернет везу и освежи страницу.",
  "common.cancel": "Откажи",
  "activity.unknown": "Ова активност не може да се прикаже овде. Освежи страницу.",

  // Participant (index.html)
  "participant.title": "Уђи у сесију",
  "participant.codeLabel": "Код сесије",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "Надимак",
  "participant.nicknameHint": "Остаје само на твом телефону. Нико други га не види, ни фацилитатор.",
  "participant.nicknamePlaceholder": "Твој надимак",
  "participant.join": "Уђи",
  "participant.joining": "Улазим…",
  "participant.errorCode": "Код има 4 слова.",
  "participant.errorNickname": "Упиши надимак (највише {max} знакова).",
  "participant.errorNotFound": "Нема сесије са овим кодом.",
  "participant.waitingTitle": "Унутра си!",
  "participant.waitingTitleNamed": "Унутра си, {nickname}!",
  "participant.waitingText": "Сачекај да фацилитатор покрене следећу активност.",
  "participant.joinedAs": "Сесија {code}",
  "participant.language": "Језик",
  "participant.languageHint": "Твој избор остаје само на овом телефону.",

  // Measurement
  "measure.phase.before": "Пре",
  "measure.phase.after": "После",
  "measure.participantTitle": "Колико се слажеш?",
  "measure.scaleLow": "1 = Уопште се не слажем",
  "measure.scaleHigh": "5 = Потпуно се слажем",
  "measure.submit": "Пошаљи",
  "measure.saving": "Шаљем…",
  "measure.saveError": "Слање није успело. Покушај поново.",
  "measure.thanksTitle": "Хвала!",
  "measure.thanksText": "Твоји одговори су сачувани. Нико не види ко је шта одговорио.",
  "measure.change": "Промени одговоре",

  // Quick poll
  "poll.questionOf": "Питање {n} од {total}",
  "poll.yes": "Да",
  "poll.no": "Не",
  "poll.true": "Тачно",
  "poll.false": "Нетачно",
  "poll.waitVoting": "Погледај екран. Гласање ускоро почиње.",
  "poll.tapToVote": "Додирни свој одговор. Можеш да га промениш док је гласање отворено.",
  "poll.voteSaved": "Сачувано. Можеш да промениш док је гласање отворено. Нико не види ко је како гласао.",
  "poll.saveError": "Слање није успело. Додирни поново.",
  "poll.closed": "Гласање је затворено. Погледај екран.",
  "poll.yourVote": "Твој глас: {option}",
  "poll.ratingLow": "1 = Нимало",
  "poll.ratingHigh": "5 = Потпуно",

  // Text answers
  "text.writeTitle": "Твој одговор",
  "text.anotherTitle": "Још један одговор",
  "text.editTitle": "Уреди свој одговор",
  "text.chars": "{count} / {max}",
  "text.send": "Пошаљи",
  "text.save": "Сачувај измене",
  "text.sending": "Шаљем…",
  "text.edit": "Уреди",
  "text.delete": "Обриши",
  "text.confirmDelete": "Обрисати овај одговор?",
  "text.left": "Можеш да пошаљеш још: {count}.",
  "text.writingClosed": "Писање је затворено. Погледај екран.",
  "text.errorLength": "Напиши нешто (највише {max} знакова).",
  "text.errorLabel": "Изабери једну од две ознаке.",
  "text.saveError": "Слање није успело. Покушај поново.",
  "text.group": "Група",
  "text.groupCheck": "Пишемо као група (један телефон за целу групу)",
  "text.labelLegend": "Тајно изабери једну ознаку",
  "text.labelHint": "Касније ће остали погађати твој избор. Твоје име се никад не приказује.",
  "text.yourLabel": "Твој тајни избор: {label}",

  // Word cloud
  "cloud.promptOf": "Задатак {n} од {total}",
  "cloud.lookAtScreen": "Погледај екран.",

  // Wall
  "wall.votesLeft": "Преостало гласова: {count} од {max}",
  "wall.noCards": "Још нема картица.",
  "wall.vote": "Гласај",
  "wall.voted": "Гласано ✓",
  "wall.votingClosed": "Гласање је затворено. Погледај екран.",

  // Moderated wall
  "modwall.statusPending": "Чека фацилитатора",
  "modwall.statusShown": "На екрану",
  "modwall.statusHidden": "Није приказано на екрану",
  "modwall.guessTitle": "Ко је ово написао?",
  "modwall.guessQuestion": "Коју ознаку је аутор изабрао?",
  "modwall.guessMine": "Ово је твој текст. Остали погађају – немој да се одаш!",
  "modwall.answerWas": "Избор аутора: {label}",

  // Common Ground
  "ground.writeHint": "Твој предлог иде прво фацилитатору. Нико не види ко га је написао.",
  "ground.canYouSign": "Можеш ли да потпишеш ово?",
  "ground.newVersionNote": "Ово је нова верзија тврдње. Гласај поново.",
  "ground.lookAtBoard": "Погледај екран: ово је оно што цела група може да потпише.",
  "ground.choice.sign": "Могу да потпишем",
  "ground.choice.change": "Уз измену",
  "ground.choice.cant": "Не могу да потпишем",
  "ground.amendLabel": "Твоја измена (није обавезно)",
  "ground.amendHint": "Напиши како би тврдњу требало променити да би могао/ла да је потпишеш. Види је само фацилитатор, без твог имена.",
  "ground.amendSend": "Пошаљи измену",
  "ground.amendSaved": "Послато фацилитатору. Можеш да је мењаш док је гласање отворено.",
  "ground.amendConfirmDelete": "Обрисати твој предлог измене?"
};
