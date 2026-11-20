import type { OpeningSpec } from "@/lib/openings/types";

/**
 * The London System (White): d4, Bf4, e3, Nf3, c3, Bd3, Nbd2, castle.
 *
 * Lines from the coach's notes; every move and side line checked with
 * Stockfish 19 (depth 18). "Also good" moves are within about 0.2 pawns of
 * the lesson's move. To add a line: add a MoveSpec under the right move's
 * `next` (the first entry is the main line). Tests check every move is legal.
 */
export const londonSystem: OpeningSpec = {
  id: "london-system",
  name: "London System",
  playAs: "w",
  moveOrder: "1. d4 2. Bf4",
  summary: "One calm setup you can play against almost anything. Less to memorise, more time to think.",
  intro:
    "You build the same solid setup against almost any defence: pawns on d4, e3 and c3, bishops on f4 and d3, knights on f3 and d2, then castle. The golden rule: bring the f4 bishop out BEFORE you play e3, or it gets shut in behind its own pawn.",
  source: "Lines from the coach's notes, checked with Stockfish 19; explanations written for this app.",
  moves: [
    {
      san: "d4",
      explanation:
        "Your pawn takes space in the centre and controls e5 and c5. It also opens the diagonal for your dark-squared bishop on c1.",
      tags: ["main line"],
      next: [
        {
          san: "d5",
          explanation: "Black claims the centre too, with a pawn opposite yours.",
          next: [
            {
              san: "Bf4",
              explanation:
                "The key move of the London. The bishop comes out BEFORE e3. If you played e3 first, this bishop would be stuck behind its own pawn.",
              tags: ["developing move"],
              next: [
                {
                  san: "Nf6",
                  explanation: "Black develops a knight towards the centre and guards the d5 pawn.",
                  next: [
                    {
                      san: "e3",
                      explanation:
                        "Now the e3 pawn protects your bishop on f4 and your pawn on d4, and opens a path for your other bishop.",
                      next: [
                        {
                          san: "e6",
                          explanation:
                            "Black opens a path for the dark-squared bishop. Black's other bishop, on c8, is now shut in: the problem the London avoids for White.",
                          next: [
                            {
                              san: "Nf3",
                              explanation: "You develop a knight towards the centre. It guards d4 and e5.",
                              tags: ["developing move"],
                              next: [
                                {
                                  san: "Bd6",
                                  explanation:
                                    "Black offers to trade bishops: the bishop on d6 attacks yours on f4. Your bishop is protected, but you have to decide what to do with it.",
                                  next: [
                                    {
                                      san: "Bg3",
                                      explanation:
                                        "The usual answer: step back and keep the bishop. If Black takes it, you take back with the h-pawn and your rook gets a half-open h-file.",
                                      alsoGood: [
                                        {
                                          san: "Bxd6",
                                          note: "Trading bishops is just as good here. You give up your good bishop, but so does Black.",
                                        },
                                        {
                                          san: "Bd3",
                                          note: "Ignoring the attack works too: if Black takes on f4, you take back with the e-pawn and that pawn controls e5.",
                                        },
                                      ],
                                      next: [
                                        {
                                          san: "O-O",
                                          explanation: "Black castles, putting the king safely in the corner.",
                                          next: [
                                            {
                                              san: "Nbd2",
                                              explanation:
                                                "The knight comes out on d2, not c3, so your c-pawn stays free to move to c3 and support d4.",
                                              next: [
                                                {
                                                  san: "c5",
                                                  explanation: "Black attacks your d4 pawn from the side.",
                                                  tags: ["central break"],
                                                  next: [
                                                    {
                                                      san: "c3",
                                                      explanation:
                                                        "The c3 pawn supports d4, so if Black takes on d4 you can take back with a pawn. Your centre stays solid.",
                                                      next: [
                                                        {
                                                          san: "Nc6",
                                                          explanation: "Black adds another attacker on d4.",
                                                          next: [
                                                            {
                                                              san: "Bd3",
                                                              explanation:
                                                                "The last piece of the setup. Your bishop aims at Black's king, and you are ready to castle. The London setup is complete: pawns d4, e3, c3; bishops f4/g3 and d3; knights f3 and d2.",
                                                              tags: ["developing move"],
                                                              verdict: "equal",
                                                            },
                                                          ],
                                                        },
                                                      ],
                                                    },
                                                  ],
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        {
                                          san: "Bxg3",
                                          name: "Black trades on g3",
                                          explanation: "Black takes the bishop.",
                                          next: [
                                            {
                                              san: "hxg3",
                                              explanation:
                                                "Take back towards the centre. Your h-pawn is gone, so the h-file is half-open for your rook, and the pawn on g3 still shields your king.",
                                              verdict: "equal",
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  san: "Nh5",
                                  name: "Black chases the bishop with ...Nh5",
                                  explanation:
                                    "The knight attacks your bishop. This time it is safe for Black: your knight on f3 blocks the queen's path to h5.",
                                  next: [
                                    {
                                      san: "Be5",
                                      explanation:
                                        "Keep the bishop. On e5 it is protected by your d4 pawn, and it stays active.",
                                      alsoGood: [
                                        {
                                          san: "Bg5",
                                          note: "Bg5 is fine too: the bishop stays active and attacks Black's queen.",
                                        },
                                      ],
                                      verdict: "equal",
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          san: "c5",
                          name: "...c5 and ...Qb6: watch your b2 pawn",
                          explanation: "Black attacks your d4 pawn straight away.",
                          tags: ["central break"],
                          next: [
                            {
                              san: "c3",
                              explanation: "Support d4 with a pawn, so your centre stays strong.",
                              alsoGood: [
                                {
                                  san: "Nf3",
                                  note: "Developing the knight first is just as good: it also protects d4.",
                                },
                              ],
                              next: [
                                {
                                  san: "Qb6",
                                  explanation:
                                    "Black's queen attacks your b2 pawn. In the London that pawn is often unprotected, so watch for this move.",
                                  next: [
                                    {
                                      san: "Qb3",
                                      explanation:
                                        "Protect b2 and offer a queen trade. If Black takes on b3, you take back with the a-pawn and your rook gets the a-file.",
                                      alsoGood: [
                                        { san: "Qc2", note: "Qc2 also protects b2 (and keeps the queens on the board)." },
                                        { san: "Qc1", note: "Qc1 also protects b2. It's a little passive, but safe." },
                                      ],
                                      next: [
                                        {
                                          san: "c4",
                                          explanation: "Black avoids the trade by attacking your queen with a pawn.",
                                          next: [
                                            {
                                              san: "Qc2",
                                              explanation:
                                                "The queen steps back to a safe square where it still protects b2 and watches the e4 square.",
                                              verdict: "equal",
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          san: "Nh5",
                          name: "Trap: 3...Nh5? loses a knight",
                          explanation:
                            "The knight attacks your bishop, but it has left itself undefended, and e3 has just opened the path from your queen on d1 to h5. Before retreating, always ask: can I just take something?",
                          tags: ["mistake"],
                          next: [
                            {
                              san: "Qxh5",
                              explanation:
                                "Your queen takes the knight for free: nothing of Black's protects h5. White is a whole piece up.",
                              tags: ["trap"],
                              verdict: "winning for White",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  san: "c5",
                  name: "Black attacks d4 early",
                  explanation: "Black hits your d4 pawn before developing.",
                  tags: ["central break"],
                  next: [
                    {
                      san: "e3",
                      explanation: "Protect d4 and your bishop, exactly as in the main line.",
                      alsoGood: [{ san: "Nf3", note: "Nf3 is just as good: it also protects d4." }],
                      next: [
                        {
                          san: "Nc6",
                          explanation: "Black puts more pressure on d4.",
                          next: [
                            {
                              san: "c3",
                              explanation: "Support d4 with a pawn. Your centre now stands on a strong chain: c3, d4, e3.",
                              alsoGood: [{ san: "Nf3", note: "Nf3 is fine too: it adds another defender of d4." }],
                              next: [
                                {
                                  san: "Qb6",
                                  explanation: "Black's queen attacks b2 again. Look for this move whenever Black plays ...c5.",
                                  next: [
                                    {
                                      san: "Qb3",
                                      explanation: "Protect b2 and offer to trade queens.",
                                      alsoGood: [{ san: "Qc2", note: "Qc2 also protects b2." }],
                                      verdict: "equal",
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          san: "Nf6",
          name: "Against ...g6 (King's Indian setup)",
          explanation: "Black develops a knight first and keeps the choice of pawn moves open.",
          next: [
            {
              san: "Bf4",
              explanation: "The same plan as always: the bishop comes out before e3.",
              tags: ["developing move"],
              next: [
                {
                  san: "g6",
                  explanation: "Black prepares to put the bishop on g7, on the long diagonal.",
                  next: [
                    {
                      san: "e3",
                      explanation: "Protect the bishop and d4, and open the path for your other bishop.",
                      next: [
                        {
                          san: "Bg7",
                          explanation: "Black's bishop takes the long diagonal.",
                          next: [
                            {
                              san: "Nf3",
                              explanation: "Develop the knight, guarding d4 and e5.",
                              next: [
                                {
                                  san: "O-O",
                                  explanation: "Black castles.",
                                  next: [
                                    {
                                      san: "Be2",
                                      explanation:
                                        "Against this setup the bishop goes to e2 rather than d3: Black often pushes ...e5 later, and on e2 your bishop is out of the way.",
                                      alsoGood: [
                                        { san: "c3", note: "c3 first is just as good: it supports d4 in the usual way." },
                                        { san: "h3", note: "h3 is fine too: it gives your bishop a safe square on h2." },
                                      ],
                                      next: [
                                        {
                                          san: "d6",
                                          explanation: "Black prepares ...e5.",
                                          next: [
                                            {
                                              san: "h3",
                                              explanation:
                                                "A useful little move: if Black's knight jumps to h5 to chase your bishop, it can retreat to h2 and stay on its diagonal.",
                                              verdict: "equal",
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
