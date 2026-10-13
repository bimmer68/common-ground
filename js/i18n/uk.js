// Українська – only the texts a participant sees on the phone.
// Same keys as en.js. A text missing here is shown in English.
export default {
  // Shared
  "common.loading": "Завантаження…",
  "common.offline": "Зв'язок втрачено. Підключаємося знову…",
  "common.error": "Щось пішло не так. Онови сторінку.",
  "common.signInError": "Не вдалося підключитися. Перевір інтернет і онови сторінку.",
  "common.cancel": "Скасувати",
  "activity.unknown": "Це завдання не можна показати тут. Онови сторінку.",

  // Participant (index.html)
  "participant.title": "Вхід до сесії",
  "participant.codeLabel": "Код сесії",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "Псевдонім",
  "participant.nicknameHint": "Він залишається лише на твоєму телефоні. Його ніхто не бачить, навіть ведучий.",
  "participant.nicknamePlaceholder": "Твій псевдонім",
  "participant.join": "Увійти",
  "participant.joining": "Вхід…",
  "participant.errorCode": "Код складається з 4 латинських літер.",
  "participant.errorNickname": "Введи псевдонім (не більше {max} символів).",
  "participant.errorNotFound": "Сесії з таким кодом немає.",
  "participant.waitingTitle": "Ласкаво просимо!",
  "participant.waitingTitleNamed": "Ласкаво просимо, {nickname}!",
  "participant.waitingText": "Зачекай, поки ведучий почне наступне завдання.",
  "participant.joinedAs": "Сесія {code}",
  "participant.language": "Мова",
  "participant.languageHint": "Твій вибір зберігається лише на цьому телефоні.",

  // Measurement
  "measure.phase.before": "До",
  "measure.phase.after": "Після",
  "measure.participantTitle": "Наскільки ти погоджуєшся?",
  "measure.scaleLow": "1 = Зовсім не погоджуюся",
  "measure.scaleHigh": "5 = Цілком погоджуюся",
  "measure.submit": "Надіслати",
  "measure.saving": "Надсилання…",
  "measure.saveError": "Не вдалося надіслати. Спробуй ще раз.",
  "measure.thanksTitle": "Дякуємо!",
  "measure.thanksText": "Твої відповіді збережено. Ніхто не бачить, хто що відповів.",
  "measure.change": "Змінити відповіді",

  // Quick poll
  "poll.questionOf": "Питання {n} з {total}",
  "poll.yes": "Так",
  "poll.no": "Ні",
  "poll.true": "Правда",
  "poll.false": "Неправда",
  "poll.waitVoting": "Дивись на екран. Голосування скоро почнеться.",
  "poll.tapToVote": "Натисни свою відповідь. Її можна змінити, поки голосування відкрите.",
  "poll.voteSaved": "Збережено. Можна змінити, поки голосування відкрите. Ніхто не бачить, хто як голосував.",
  "poll.saveError": "Не вдалося надіслати. Натисни ще раз.",
  "poll.closed": "Голосування закрито. Дивись на екран.",
  "poll.yourVote": "Твій голос: {option}",
  "poll.ratingLow": "1 = Зовсім ні",
  "poll.ratingHigh": "5 = Повністю",

  // Text answers
  "text.writeTitle": "Твоя відповідь",
  "text.anotherTitle": "Ще одна відповідь",
  "text.editTitle": "Змінити відповідь",
  "text.chars": "{count} / {max}",
  "text.send": "Надіслати",
  "text.save": "Зберегти зміни",
  "text.sending": "Надсилання…",
  "text.edit": "Змінити",
  "text.delete": "Видалити",
  "text.confirmDelete": "Видалити цю відповідь?",
  "text.left": "Можна надіслати ще: {count}.",
  "text.writingClosed": "Приймання відповідей закрито. Дивись на екран.",
  "text.errorLength": "Напиши щось (не більше {max} символів).",
  "text.errorLabel": "Обери одну з двох позначок.",
  "text.saveError": "Не вдалося надіслати. Спробуй ще раз.",
  "text.group": "Група",
  "text.groupCheck": "Пишемо як група (один телефон на всю групу)",
  "text.labelLegend": "Таємно обери одну позначку",
  "text.labelHint": "Пізніше інші вгадуватимуть твій вибір. Твоє ім'я ніколи не показується.",
  "text.yourLabel": "Твій таємний вибір: {label}",

  // Word cloud
  "cloud.promptOf": "Завдання {n} з {total}",
  "cloud.lookAtScreen": "Дивись на екран.",

  // Wall
  "wall.votesLeft": "Залишилось голосів: {count} з {max}",
  "wall.noCards": "Карток поки немає.",
  "wall.vote": "Голосувати",
  "wall.voted": "Голос віддано ✓",
  "wall.votingClosed": "Голосування закрито. Дивись на екран.",

  // Moderated wall
  "modwall.statusPending": "Чекає на ведучого",
  "modwall.statusShown": "На екрані",
  "modwall.statusHidden": "Не показано на екрані",
  "modwall.guessTitle": "Хто це написав?",
  "modwall.guessQuestion": "Яку позначку обрав автор?",
  "modwall.guessMine": "Це твій текст. Інші вгадують – не видай себе!",
  "modwall.answerWas": "Вибір автора: {label}",

  // Common Ground
  "ground.writeHint": "Твоя пропозиція спочатку надходить ведучому. Ніхто не бачить, хто її написав.",
  "ground.canYouSign": "Чи можеш ти під цим підписатися?",
  "ground.newVersionNote": "Це нова версія твердження. Проголосуй ще раз.",
  "ground.lookAtBoard": "Дивись на екран: ось під чим може підписатися вся група.",
  "ground.choice.sign": "Можу підписатися",
  "ground.choice.change": "Зі змінами",
  "ground.choice.cant": "Не можу підписатися"
};
