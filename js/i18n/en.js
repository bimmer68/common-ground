// All interface texts (English). Later, other languages get their own file
// with the same keys. Never write interface text directly in HTML or logic.
export default {
  "app.name": "Common Ground",

  // Shared
  "common.loading": "Loading…",
  "common.offline": "Connection lost. Reconnecting…",
  "common.error": "Something went wrong. Please refresh the page.",
  "common.signInError": "Could not connect. Check the internet connection and refresh the page.",

  // Participant (index.html)
  "participant.title": "Join session",
  "participant.codeLabel": "Session code",
  "participant.codePlaceholder": "ABCD",
  "participant.nicknameLabel": "Nickname",
  "participant.nicknameHint": "Only the facilitator sees it. Never shown on the screen.",
  "participant.nicknamePlaceholder": "Your nickname",
  "participant.join": "Join",
  "participant.joining": "Joining…",
  "participant.errorCode": "The code has 4 letters.",
  "participant.errorNickname": "Please enter a nickname (max {max} characters).",
  "participant.errorNotFound": "No session with this code.",
  "participant.waitingTitle": "You're in!",
  "participant.waitingText": "Wait for the facilitator to start the next activity.",
  "participant.joinedAs": "Joined as {nickname} in session {code}",

  // Projector (screen.html)
  "screen.title": "Common Ground – Screen",
  "screen.scanToJoin": "Scan to join",
  "screen.orGoTo": "or open {url} and enter the code",
  "screen.participants": "{count} joined",
  "screen.noCode": "Open this page from the facilitator's link (screen.html?s=CODE).",
  "screen.notFound": "No session with code {code}.",

  // Facilitator (host.html)
  "host.title": "Common Ground – Facilitator",
  "host.intro": "Create a new session for this workshop.",
  "host.create": "Create session",
  "host.creating": "Creating…",
  "host.sessionCode": "Session code",
  "host.openScreen": "Open projector screen",
  "host.participantLink": "Participant link",
  "host.participantsTitle": "Participants ({count})",
  "host.noParticipants": "Nobody has joined yet.",
  "host.newSession": "Start a new session",
  "host.confirmNew": "Start a new session? The current one stays saved, but this phone will stop showing it.",
  "host.notYours": "Session {code} was created on another device. Create a new one here."
};
