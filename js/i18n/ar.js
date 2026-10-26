// العربية (Arabic, right to left) – only the texts a participant sees on the phone.
// Same keys as en.js. A text missing here is shown in English.
export default {
  // Shared
  "common.loading": "جارٍ التحميل…",
  "common.offline": "انقطع الاتصال. جارٍ إعادة الاتصال…",
  "common.error": "حدث خطأ ما. يُرجى تحديث الصفحة.",
  "common.signInError": "تعذّر الاتصال. يُرجى التحقق من الإنترنت وتحديث الصفحة.",
  "common.cancel": "إلغاء",
  "activity.unknown": "لا يمكن عرض هذا النشاط هنا. يُرجى تحديث الصفحة.",

  // Participant (index.html)
  "participant.title": "الانضمام إلى الجلسة",
  "participant.codeLabel": "رمز الجلسة",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "الاسم المستعار",
  "participant.nicknameHint": "يبقى على هاتفك فقط. لا يراه أحد غيرك، ولا حتى الميسِّر.",
  "participant.nicknamePlaceholder": "اسمك المستعار",
  "participant.join": "انضمام",
  "participant.joining": "جارٍ الانضمام…",
  "participant.errorCode": "يتكوّن الرمز من 4 أحرف لاتينية.",
  "participant.errorNickname": "يُرجى كتابة اسم مستعار (بحد أقصى {max} حرفًا).",
  "participant.errorNotFound": "لا توجد جلسة بهذا الرمز.",
  "participant.waitingTitle": "أهلًا بك!",
  "participant.waitingTitleNamed": "أهلًا بك، {nickname}!",
  "participant.waitingText": "انتظر حتى يبدأ الميسِّر النشاط التالي.",
  "participant.joinedAs": "الجلسة {code}",
  "participant.language": "اللغة",
  "participant.languageHint": "يبقى اختيارك على هذا الهاتف فقط.",

  // Measurement
  "measure.phase.before": "قبل",
  "measure.phase.after": "بعد",
  "measure.participantTitle": "ما مدى موافقتك؟",
  "measure.scaleLow": "1 = لا أوافق إطلاقًا",
  "measure.scaleHigh": "5 = أوافق تمامًا",
  "measure.submit": "إرسال",
  "measure.saving": "جارٍ الإرسال…",
  "measure.saveError": "تعذّر الإرسال. يُرجى المحاولة مرة أخرى.",
  "measure.thanksTitle": "شكرًا!",
  "measure.thanksText": "تم حفظ إجاباتك. لا يرى أحد مَن أجاب بماذا.",
  "measure.change": "تغيير إجاباتي",

  // Quick poll
  "poll.questionOf": "السؤال {n} من {total}",
  "poll.yes": "نعم",
  "poll.no": "لا",
  "poll.true": "صحيح",
  "poll.false": "خطأ",
  "poll.waitVoting": "انظر إلى الشاشة. سيبدأ التصويت قريبًا.",
  "poll.tapToVote": "اضغط على إجابتك. يمكنك تغييرها ما دام التصويت مفتوحًا.",
  "poll.voteSaved": "تم الحفظ. يمكنك التغيير ما دام التصويت مفتوحًا. لا يرى أحد مَن صوّت بماذا.",
  "poll.saveError": "تعذّر الإرسال. اضغط مرة أخرى.",
  "poll.closed": "أُغلق التصويت. انظر إلى الشاشة.",
  "poll.yourVote": "صوتك: {option}",
  "poll.ratingLow": "1 = إطلاقًا",
  "poll.ratingHigh": "5 = تمامًا",

  // Text answers
  "text.writeTitle": "إجابتك",
  "text.anotherTitle": "إجابة أخرى",
  "text.editTitle": "تعديل إجابتك",
  "text.chars": "{count} من {max}",
  "text.send": "إرسال",
  "text.save": "حفظ التغييرات",
  "text.sending": "جارٍ الإرسال…",
  "text.edit": "تعديل",
  "text.delete": "حذف",
  "text.confirmDelete": "هل تريد حذف هذه الإجابة؟",
  "text.left": "يمكنك إرسال المزيد: {count}.",
  "text.writingClosed": "أُغلقت الكتابة. انظر إلى الشاشة.",
  "text.errorLength": "يُرجى كتابة شيء ما (بحد أقصى {max} حرفًا).",
  "text.errorLabel": "يُرجى اختيار إحدى العلامتين.",
  "text.saveError": "تعذّر الإرسال. يُرجى المحاولة مرة أخرى.",
  "text.group": "مجموعة",
  "text.groupCheck": "نكتب كمجموعة (هاتف واحد للمجموعة كلها)",
  "text.labelLegend": "اختر علامة واحدة سرًّا",
  "text.labelHint": "لاحقًا سيحاول الآخرون تخمين العلامة التي اخترتها. لا يظهر اسمك أبدًا.",
  "text.yourLabel": "اختيارك السري: {label}",

  // Word cloud
  "cloud.promptOf": "المحفّز {n} من {total}",
  "cloud.lookAtScreen": "انظر إلى الشاشة.",

  // Wall
  "wall.votesLeft": "الأصوات المتبقية: {count} من {max}",
  "wall.noCards": "لا توجد بطاقات بعد.",
  "wall.vote": "صوِّت",
  "wall.voted": "تم التصويت ✓",
  "wall.votingClosed": "أُغلق التصويت. انظر إلى الشاشة.",

  // Moderated wall
  "modwall.statusPending": "بانتظار الميسِّر",
  "modwall.statusShown": "على الشاشة",
  "modwall.statusHidden": "غير معروض على الشاشة",
  "modwall.guessTitle": "مَن كتب هذا؟",
  "modwall.guessQuestion": "أي علامة اختارها الكاتب؟",
  "modwall.guessMine": "هذا نصك. الآخرون يخمّنون – لا تكشف نفسك!",
  "modwall.answerWas": "اختيار الكاتب: {label}",

  // Common Ground
  "ground.writeHint": "يذهب اقتراحك أولًا إلى الميسِّر. لا يرى أحد مَن كتبه.",
  "ground.canYouSign": "هل يمكنك التوقيع على هذا؟",
  "ground.newVersionNote": "هذه صيغة جديدة للعبارة. يُرجى التصويت مرة أخرى.",
  "ground.lookAtBoard": "انظر إلى الشاشة: هذا ما يمكن للمجموعة كلها أن توقّع عليه.",
  "ground.choice.sign": "يمكنني التوقيع",
  "ground.choice.change": "مع تعديل",
  "ground.choice.cant": "لا يمكنني التوقيع",
  "ground.amendLabel": "تعديلك (اختياري)",
  "ground.amendHint": "اكتب كيف يجب تغيير العبارة لتتمكن من التوقيع عليها. لا يراه إلا الميسّر، ومن دون اسمك.",
  "ground.amendSend": "أرسل التعديل",
  "ground.amendSaved": "أُرسل إلى الميسّر. يمكنك تغييره ما دام التصويت مفتوحًا.",
  "ground.amendConfirmDelete": "هل تريد حذف التعديل الذي اقترحته؟"
};
