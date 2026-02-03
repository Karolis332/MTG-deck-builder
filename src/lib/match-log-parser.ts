/**
 * Parses MTGA game log text into structured match data.
 * Handles the format from untapped.gg / MTGA tracker exports.
 */

export interface ParsedMatch {
  result: 'win' | 'loss' | 'draw';
  playDraw: 'play' | 'draw' | null;
  opponentName: string | null;
  turns: number;
  myLifeEnd: number;
  opponentLifeEnd: number;
  myCardsSeen: string[];
  opponentCardsSeen: string[];
  opponentDeckColors: string[];
  /** Cards seen per turn — key is turn number (0 = opening hand), value is card names */
  myCardsByTurn: Record<number, string[]>;
}

// Color detection from card names (basic lands and common indicators)
const COLOR_INDICATORS: Record<string, string> = {
  Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G',
};

export function parseGameLog(log: string, myPlayerName: string): ParsedMatch {
  const lines = log.split('\n').map((l) => l.trim()).filter(Boolean);

  let result: 'win' | 'loss' | 'draw' = 'loss';
  let playDraw: 'play' | 'draw' | null = null;
  let opponentName: string | null = null;
  let turns = 0;
  let myLife = 20;
  let opponentLife = 20;
  const myCardsSeen = new Set<string>();
  const opponentCardsSeen = new Set<string>();
  const opponentLands = new Set<string>();

  const myNameLower = myPlayerName.toLowerCase();

  // Detect players from roll or "plays first"
  const playerList: string[] = [];
  for (const line of lines) {
    const rollMatch = line.match(/^(\S+)\s+rolled\s+/i);
    if (rollMatch && !playerList.includes(rollMatch[1])) {
      playerList.push(rollMatch[1]);
    }

    const playsFirstMatch = line.match(/^(\S+)\s+plays first/i);
    if (playsFirstMatch) {
      const firstPlayer = playsFirstMatch[1];
      if (firstPlayer.toLowerCase() === myNameLower) {
        playDraw = 'play';
      } else {
        playDraw = 'draw';
      }
    }
  }

  // Get opponent name
  for (const p of playerList) {
    if (p.toLowerCase() !== myNameLower) {
      opponentName = p;
    }
  }

  const opponentNameLower = opponentName?.toLowerCase() || '';

  // Track turn numbers and which player's turn it is
  const turnRegex = /^Turn\s+(\d+):\s+(.+)/i;
  let currentTurn = 0;
  let currentTurnIsMe = false;
  const myCardsByTurn: Record<number, string[]> = {};

  function addCardToTurn(cardName: string, turn: number) {
    if (!myCardsByTurn[turn]) myCardsByTurn[turn] = [];
    myCardsByTurn[turn].push(cardName);
  }

  for (const line of lines) {
    // Track turns
    const turnMatch = line.match(turnRegex);
    if (turnMatch) {
      const turnNum = parseInt(turnMatch[1], 10);
      const turnPlayer = turnMatch[2].trim();
      if (turnNum > turns) turns = turnNum;
      // Track whose turn it is — use the player's turn number (my T1, my T2, etc)
      currentTurnIsMe = turnPlayer.toLowerCase() === myNameLower;
      if (currentTurnIsMe) {
        currentTurn = turnNum;
      }
    }

    // Track life totals
    const lifeMatch = line.match(/(\S+)\s+'s life total is (?:down |up )?to\s+(\d+)/i);
    if (lifeMatch) {
      const life = parseInt(lifeMatch[2], 10);
      if (lifeMatch[1].toLowerCase() === myNameLower) {
        myLife = life;
      } else {
        opponentLife = life;
      }
    }

    // Track cards cast/played by me — with turn tracking
    const myCastMatch = line.match(new RegExp(`${escapeRegex(myPlayerName)}\\s+cast\\s+(.+)`, 'i'));
    if (myCastMatch) {
      const cardName = cleanCardName(myCastMatch[1]);
      myCardsSeen.add(cardName);
      addCardToTurn(cardName, currentTurn);
    }
    const myPlayMatch = line.match(new RegExp(`${escapeRegex(myPlayerName)}\\s+played\\s+(.+)`, 'i'));
    if (myPlayMatch) {
      const cardName = cleanCardName(myPlayMatch[1]);
      myCardsSeen.add(cardName);
      addCardToTurn(cardName, currentTurn);
    }
    const myDrawMatch = line.match(new RegExp(`${escapeRegex(myPlayerName)}\\s+drew\\s+(.+)`, 'i'));
    if (myDrawMatch && !myDrawMatch[1].match(/^a card$/i)) {
      const cardName = cleanCardName(myDrawMatch[1]);
      myCardsSeen.add(cardName);
      // Cards drawn on T1 before first play are opening hand (turn 0)
      addCardToTurn(cardName, currentTurn);
    }

    // Track cards cast/played by opponent
    if (opponentName) {
      const oppCastMatch = line.match(new RegExp(`${escapeRegex(opponentName)}\\s+cast\\s+(.+)`, 'i'));
      if (oppCastMatch) {
        const card = cleanCardName(oppCastMatch[1]);
        opponentCardsSeen.add(card);
      }
      const oppPlayMatch = line.match(new RegExp(`${escapeRegex(opponentName)}\\s+played\\s+(.+)`, 'i'));
      if (oppPlayMatch) {
        const card = cleanCardName(oppPlayMatch[1]);
        opponentCardsSeen.add(card);
        if (COLOR_INDICATORS[card]) {
          opponentLands.add(COLOR_INDICATORS[card]);
        }
      }
    }

    // Track win/loss
    const wonMatch = line.match(/(\S+)\s+won!/i);
    if (wonMatch) {
      result = wonMatch[1].toLowerCase() === myNameLower ? 'win' : 'loss';
    }

    const concededMatch = line.match(/(\S+)\s+conceded/i);
    if (concededMatch) {
      result = concededMatch[1].toLowerCase() === myNameLower ? 'loss' : 'win';
    }
  }

  // Detect opponent colors from their lands and colored spells
  const opponentDeckColorsArr: string[] = [];
  opponentLands.forEach((c) => opponentDeckColorsArr.push(c));
  const myCardsArr: string[] = [];
  myCardsSeen.forEach((c) => myCardsArr.push(c));
  const oppCardsArr: string[] = [];
  opponentCardsSeen.forEach((c) => oppCardsArr.push(c));

  return {
    result,
    playDraw,
    opponentName,
    turns,
    myLifeEnd: myLife,
    opponentLifeEnd: opponentLife,
    myCardsSeen: myCardsArr,
    opponentCardsSeen: oppCardsArr,
    opponentDeckColors: opponentDeckColorsArr,
    myCardsByTurn,
  };
}

function cleanCardName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
