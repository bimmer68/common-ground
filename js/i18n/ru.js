// Русский – only the texts a participant sees on the phone.
// Same keys as en.js. A text missing here is shown in English.
export default {
  // Shared
  "common.loading": "Загрузка…",
  "common.offline": "Связь потеряна. Подключаемся снова…",
  "common.error": "Что-то пошло не так. Обнови страницу.",
  "common.signInError": "Не удалось подключиться. Проверь интернет и обнови страницу.",
  "common.cancel": "Отмена",
  "activity.unknown": "Это задание нельзя показать здесь. Обнови страницу.",

  // Participant (index.html)
  "participant.title": "Вход в сессию",
  "participant.codeLabel": "Код сессии",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "Псевдоним",
  "participant.nicknameHint": "Он остаётся только на твоём телефоне. Его никто не видит, даже ведущий.",
  "participant.nicknamePlaceholder": "Твой псевдоним",
  "participant.join": "Войти",
  "participant.joining": "Вход…",
  "participant.errorCode": "Код состоит из 4 латинских букв.",
  "participant.errorNickname": "Введи псевдоним (не больше {max} символов).",
  "participant.errorNotFound": "Сессии с таким кодом нет.",
  "participant.waitingTitle": "Добро пожаловать!",
  "participant.waitingTitleNamed": "Добро пожаловать, {nickname}!",
  "participant.waitingText": "Подожди, пока ведущий начнёт следующее задание.",
  "participant.joinedAs": "Сессия {code}",
  "participant.language": "Язык",
  "participant.languageHint": "Твой выбор хранится только на этом телефоне.",

  // Measurement
  "measure.phase.before": "До",
  "measure.phase.after": "После",
  "measure.participantTitle": "Насколько ты согласен(-на)?",
  "measure.scaleLow": "1 = Совсем не согласен(-на)",
  "measure.scaleHigh": "5 = Полностью согласен(-на)",
  "measure.submit": "Отправить",
  "measure.saving": "Отправка…",
  "measure.saveError": "Не удалось отправить. Попробуй ещё раз.",
  "measure.thanksTitle": "Спасибо!",
  "measure.thanksText": "Твои ответы сохранены. Никто не видит, кто что ответил.",
  "measure.change": "Изменить ответы",

  // Quick poll
  "poll.questionOf": "Вопрос {n} из {total}",
  "poll.yes": "Да",
  "poll.no": "Нет",
  "poll.true": "Верно",
  "poll.false": "Неверно",
  "poll.waitVoting": "Смотри на экран. Голосование скоро начнётся.",
  "poll.tapToVote": "Нажми на свой ответ. Его можно изменить, пока голосование открыто.",
  "poll.voteSaved": "Сохранено. Можно изменить, пока голосование открыто. Никто не видит, кто как голосовал.",
  "poll.saveError": "Не удалось отправить. Нажми ещё раз.",
  "poll.closed": "Голосование закрыто. Смотри на экран.",
  "poll.yourVote": "Твой голос: {option}",
  "poll.ratingLow": "1 = Совсем нет",
  "poll.ratingHigh": "5 = Полностью",

  // Text answers
  "text.writeTitle": "Твой ответ",
  "text.anotherTitle": "Ещё один ответ",
  "text.editTitle": "Изменить ответ",
  "text.chars": "{count} / {max}",
  "text.send": "Отправить",
  "text.save": "Сохранить изменения",
  "text.sending": "Отправка…",
  "text.edit": "Изменить",
  "text.delete": "Удалить",
  "text.confirmDelete": "Удалить этот ответ?",
  "text.left": "Можно отправить ещё: {count}.",
  "text.writingClosed": "Приём ответов закрыт. Смотри на экран.",
  "text.errorLength": "Напиши что-нибудь (не больше {max} символов).",
  "text.errorLabel": "Выбери одну из двух меток.",
  "text.saveError": "Не удалось отправить. Попробуй ещё раз.",
  "text.group": "Группа",
  "text.groupCheck": "Пишем как группа (один телефон на всю группу)",
  "text.labelLegend": "Тайно выбери одну метку",
  "text.labelHint": "Позже остальные будут угадывать твой выбор. Твоё имя никогда не показывается.",
  "text.yourLabel": "Твой тайный выбор: {label}",

  // Word cloud
  "cloud.promptOf": "Задание {n} из {total}",
  "cloud.lookAtScreen": "Смотри на экран.",

  // Wall
  "wall.votesLeft": "Осталось голосов: {count} из {max}",
  "wall.noCards": "Карточек пока нет.",
  "wall.vote": "Голосовать",
  "wall.voted": "Голос отдан ✓",
  "wall.votingClosed": "Голосование закрыто. Смотри на экран.",

  // Moderated wall
  "modwall.statusPending": "Ждёт ведущего",
  "modwall.statusShown": "На экране",
  "modwall.statusHidden": "Не показано на экране",
  "modwall.guessTitle": "Кто это написал?",
  "modwall.guessQuestion": "Какую метку выбрал автор?",
  "modwall.guessMine": "Это твой текст. Остальные угадывают – не выдай себя!",
  "modwall.answerWas": "Выбор автора: {label}",

  // Common Ground
  "ground.writeHint": "Твоё предложение сначала попадает к ведущему. Никто не видит, кто его написал.",
  "ground.canYouSign": "Можешь ли ты подписаться под этим?",
  "ground.newVersionNote": "Это новая версия утверждения. Проголосуй ещё раз.",
  "ground.lookAtBoard": "Смотри на экран: вот под чем может подписаться вся группа.",
  "ground.choice.sign": "Могу подписаться",
  "ground.choice.change": "С изменением",
  "ground.choice.cant": "Не могу подписаться",
  "ground.amendLabel": "Ваше изменение (необязательно)",
  "ground.amendHint": "Напишите, как изменить утверждение, чтобы вы могли его подписать. Его видит только фасилитатор, без вашего имени.",
  "ground.amendSend": "Отправить изменение",
  "ground.amendSaved": "Отправлено фасилитатору. Его можно изменить, пока голосование открыто.",
  "ground.amendConfirmDelete": "Удалить предложенное изменение?"
};
