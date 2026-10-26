// עברית (Hebrew, right to left) – only the texts a participant sees on the phone.
// Same keys as en.js. A text missing here is shown in English.
export default {
  // Shared
  "common.loading": "טוען…",
  "common.offline": "החיבור נותק. מתחברים מחדש…",
  "common.error": "משהו השתבש. יש לרענן את הדף.",
  "common.signInError": "לא ניתן להתחבר. יש לבדוק את החיבור לאינטרנט ולרענן את הדף.",
  "common.cancel": "ביטול",
  "activity.unknown": "לא ניתן להציג כאן את הפעילות הזו. יש לרענן את הדף.",

  // Participant (index.html)
  "participant.title": "כניסה למפגש",
  "participant.codeLabel": "קוד המפגש",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "כינוי",
  "participant.nicknameHint": "הכינוי נשאר רק בטלפון שלך. אף אחד אחר לא רואה אותו, גם לא המנחה.",
  "participant.nicknamePlaceholder": "הכינוי שלך",
  "participant.join": "כניסה",
  "participant.joining": "נכנסים…",
  "participant.errorCode": "הקוד מורכב מ־4 אותיות לטיניות.",
  "participant.errorNickname": "יש להזין כינוי (עד {max} תווים).",
  "participant.errorNotFound": "אין מפגש עם הקוד הזה.",
  "participant.waitingTitle": "ברוכים הבאים!",
  "participant.waitingTitleNamed": "ברוכים הבאים, {nickname}!",
  "participant.waitingText": "יש לחכות עד שהמנחה יתחיל את הפעילות הבאה.",
  "participant.joinedAs": "מפגש {code}",
  "participant.language": "שפה",
  "participant.languageHint": "הבחירה שלך נשמרת רק בטלפון הזה.",

  // Measurement
  "measure.phase.before": "לפני",
  "measure.phase.after": "אחרי",
  "measure.participantTitle": "עד כמה יש לך הסכמה?",
  "measure.scaleLow": "1 = בכלל לא מסכים/ה",
  "measure.scaleHigh": "5 = מסכים/ה לגמרי",
  "measure.submit": "שליחה",
  "measure.saving": "שולח…",
  "measure.saveError": "השליחה נכשלה. יש לנסות שוב.",
  "measure.thanksTitle": "תודה!",
  "measure.thanksText": "התשובות שלך נשמרו. אף אחד לא רואה מי ענה מה.",
  "measure.change": "שינוי התשובות שלי",

  // Quick poll
  "poll.questionOf": "שאלה {n} מתוך {total}",
  "poll.yes": "כן",
  "poll.no": "לא",
  "poll.true": "נכון",
  "poll.false": "לא נכון",
  "poll.waitVoting": "כדאי להסתכל על המסך. ההצבעה תיפתח בקרוב.",
  "poll.tapToVote": "יש ללחוץ על התשובה שלך. אפשר לשנות אותה כל עוד ההצבעה פתוחה.",
  "poll.voteSaved": "נשמר. אפשר לשנות כל עוד ההצבעה פתוחה. אף אחד לא רואה מי הצביע מה.",
  "poll.saveError": "השליחה נכשלה. יש ללחוץ שוב.",
  "poll.closed": "ההצבעה נסגרה. כדאי להסתכל על המסך.",
  "poll.yourVote": "ההצבעה שלך: {option}",
  "poll.ratingLow": "1 = בכלל לא",
  "poll.ratingHigh": "5 = לגמרי",

  // Text answers
  "text.writeTitle": "התשובה שלך",
  "text.anotherTitle": "תשובה נוספת",
  "text.editTitle": "עריכת התשובה שלך",
  "text.chars": "{count} מתוך {max}",
  "text.send": "שליחה",
  "text.save": "שמירת השינויים",
  "text.sending": "שולח…",
  "text.edit": "עריכה",
  "text.delete": "מחיקה",
  "text.confirmDelete": "למחוק את התשובה הזו?",
  "text.left": "אפשר לשלוח עוד: {count}.",
  "text.writingClosed": "הכתיבה נסגרה. כדאי להסתכל על המסך.",
  "text.errorLength": "יש לכתוב משהו (עד {max} תווים).",
  "text.errorLabel": "יש לבחור אחת משתי התוויות.",
  "text.saveError": "השליחה נכשלה. יש לנסות שוב.",
  "text.group": "קבוצה",
  "text.groupCheck": "אנחנו כותבים כקבוצה (טלפון אחד לכל הקבוצה)",
  "text.labelLegend": "בחירה סודית של תווית אחת",
  "text.labelHint": "אחר כך האחרים ינחשו איזו תווית בחרת. השם שלך לעולם לא מוצג.",
  "text.yourLabel": "הבחירה הסודית שלך: {label}",

  // Word cloud
  "cloud.promptOf": "משימה {n} מתוך {total}",
  "cloud.lookAtScreen": "כדאי להסתכל על המסך.",

  // Wall
  "wall.votesLeft": "הצבעות שנותרו: {count} מתוך {max}",
  "wall.noCards": "אין עדיין כרטיסים.",
  "wall.vote": "הצבעה",
  "wall.voted": "הצבעת ✓",
  "wall.votingClosed": "ההצבעה נסגרה. כדאי להסתכל על המסך.",

  // Moderated wall
  "modwall.statusPending": "ממתין למנחה",
  "modwall.statusShown": "על המסך",
  "modwall.statusHidden": "לא מוצג על המסך",
  "modwall.guessTitle": "מי כתב את זה?",
  "modwall.guessQuestion": "איזו תווית נבחרה על ידי הכותב?",
  "modwall.guessMine": "זה הטקסט שלך. האחרים מנחשים – לא לגלות!",
  "modwall.answerWas": "הבחירה של הכותב: {label}",

  // Common Ground
  "ground.writeHint": "ההצעה שלך מגיעה קודם למנחה. אף אחד לא רואה מי כתב אותה.",
  "ground.canYouSign": "האם אפשר לחתום על זה מבחינתך?",
  "ground.newVersionNote": "זו גרסה חדשה של ההצהרה. יש להצביע שוב.",
  "ground.lookAtBoard": "כדאי להסתכל על המסך: על זה כל הקבוצה יכולה לחתום.",
  "ground.choice.sign": "אני יכול/ה לחתום",
  "ground.choice.change": "עם שינוי",
  "ground.choice.cant": "אני לא יכול/ה לחתום",
  "ground.amendLabel": "השינוי שלך (לא חובה)",
  "ground.amendHint": "כתבו איך צריך לשנות את המשפט כדי שתוכלו לחתום עליו. רק המנחה רואה אותו, בלי השם שלכם.",
  "ground.amendSend": "שליחת השינוי",
  "ground.amendSaved": "נשלח למנחה. אפשר לשנות אותו כל עוד ההצבעה פתוחה.",
  "ground.amendConfirmDelete": "למחוק את השינוי שהצעתם?"
};
