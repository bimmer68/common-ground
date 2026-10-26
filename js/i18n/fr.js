// Français – seulement les textes que le participant voit sur son téléphone.
// Mêmes clés que en.js. Un texte absent ici s'affiche en anglais.
export default {
  // Shared
  "common.loading": "Chargement…",
  "common.offline": "Connexion perdue. Reconnexion…",
  "common.error": "Un problème est survenu. Actualise la page.",
  "common.signInError": "Connexion impossible. Vérifie la connexion internet et actualise la page.",
  "common.cancel": "Annuler",
  "activity.unknown": "Cette activité ne peut pas s'afficher ici. Actualise la page.",

  // Participant (index.html)
  "participant.title": "Rejoindre la session",
  "participant.codeLabel": "Code de la session",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "Surnom",
  "participant.nicknameHint": "Il reste seulement sur ton téléphone. Personne d'autre ne le voit, pas même l'animateur.",
  "participant.nicknamePlaceholder": "Ton surnom",
  "participant.join": "Rejoindre",
  "participant.joining": "Connexion…",
  "participant.errorCode": "Le code a 4 lettres.",
  "participant.errorNickname": "Écris un surnom (max {max} caractères).",
  "participant.errorNotFound": "Aucune session avec ce code.",
  "participant.waitingTitle": "Tu es dedans !",
  "participant.waitingTitleNamed": "Tu es dedans, {nickname} !",
  "participant.waitingText": "Attends que l'animateur lance la prochaine activité.",
  "participant.joinedAs": "Session {code}",
  "participant.language": "Langue",
  "participant.languageHint": "Ton choix reste seulement sur ce téléphone.",

  // Measurement
  "measure.phase.before": "Avant",
  "measure.phase.after": "Après",
  "measure.participantTitle": "Dans quelle mesure es-tu d'accord ?",
  "measure.scaleLow": "1 = Pas du tout d'accord",
  "measure.scaleHigh": "5 = Tout à fait d'accord",
  "measure.submit": "Envoyer",
  "measure.saving": "Envoi…",
  "measure.saveError": "Envoi impossible. Réessaie.",
  "measure.thanksTitle": "Merci !",
  "measure.thanksText": "Tes réponses sont enregistrées. Personne ne voit qui a répondu quoi.",
  "measure.change": "Modifier mes réponses",

  // Quick poll
  "poll.questionOf": "Question {n} sur {total}",
  "poll.yes": "Oui",
  "poll.no": "Non",
  "poll.true": "Vrai",
  "poll.false": "Faux",
  "poll.waitVoting": "Regarde l'écran. Le vote va bientôt commencer.",
  "poll.tapToVote": "Touche ta réponse. Tu peux la changer tant que le vote est ouvert.",
  "poll.voteSaved": "Enregistré. Tu peux changer tant que le vote est ouvert. Personne ne voit qui a voté quoi.",
  "poll.saveError": "Envoi impossible. Touche à nouveau.",
  "poll.closed": "Le vote est fermé. Regarde l'écran.",
  "poll.yourVote": "Ton vote : {option}",
  "poll.ratingLow": "1 = Pas du tout",
  "poll.ratingHigh": "5 = Complètement",

  // Text answers
  "text.writeTitle": "Ta réponse",
  "text.anotherTitle": "Une autre réponse",
  "text.editTitle": "Modifier ta réponse",
  "text.chars": "{count} / {max}",
  "text.send": "Envoyer",
  "text.save": "Enregistrer",
  "text.sending": "Envoi…",
  "text.edit": "Modifier",
  "text.delete": "Supprimer",
  "text.confirmDelete": "Supprimer cette réponse ?",
  "text.left": "Tu peux encore en envoyer : {count}.",
  "text.writingClosed": "L'écriture est fermée. Regarde l'écran.",
  "text.errorLength": "Écris quelque chose (max {max} caractères).",
  "text.errorLabel": "Choisis l'une des deux étiquettes.",
  "text.saveError": "Envoi impossible. Réessaie.",
  "text.group": "Groupe",
  "text.groupCheck": "Nous écrivons en groupe (un téléphone pour tout le groupe)",
  "text.labelLegend": "Choisis en secret une étiquette",
  "text.labelHint": "Plus tard, les autres devineront laquelle tu as choisie. Ton nom n'est jamais affiché.",
  "text.yourLabel": "Ton choix secret : {label}",

  // Word cloud
  "cloud.promptOf": "Consigne {n} sur {total}",
  "cloud.lookAtScreen": "Regarde l'écran.",

  // Wall
  "wall.votesLeft": "Votes restants : {count} sur {max}",
  "wall.noCards": "Pas encore de cartes.",
  "wall.vote": "Voter",
  "wall.voted": "Voté ✓",
  "wall.votingClosed": "Le vote est fermé. Regarde l'écran.",

  // Moderated wall
  "modwall.statusPending": "En attente de l'animateur",
  "modwall.statusShown": "À l'écran",
  "modwall.statusHidden": "Pas affiché à l'écran",
  "modwall.guessTitle": "Qui a écrit ceci ?",
  "modwall.guessQuestion": "Quelle étiquette l'auteur a-t-il choisie ?",
  "modwall.guessMine": "C'est ton texte. Les autres devinent – ne te trahis pas !",
  "modwall.answerWas": "L'auteur a choisi : {label}",

  // Common Ground
  "ground.writeHint": "Ta proposition va d'abord à l'animateur. Personne ne voit qui l'a écrite.",
  "ground.canYouSign": "Peux-tu signer ceci ?",
  "ground.newVersionNote": "C'est une nouvelle version de l'affirmation. Vote à nouveau.",
  "ground.lookAtBoard": "Regarde l'écran : voici ce que tout le groupe peut signer.",
  "ground.choice.sign": "Je peux signer",
  "ground.choice.change": "Avec une modification",
  "ground.choice.cant": "Je ne peux pas signer",
  "ground.amendLabel": "Ta modification (facultatif)",
  "ground.amendHint": "Écris comment l'affirmation devrait changer pour que tu puisses la signer. Seul l'animateur la voit, sans ton nom.",
  "ground.amendSend": "Envoyer ma modification",
  "ground.amendSaved": "Envoyé à l'animateur. Tu peux encore la changer tant que le vote est ouvert.",
  "ground.amendConfirmDelete": "Supprimer la modification que tu as proposée ?"
};
