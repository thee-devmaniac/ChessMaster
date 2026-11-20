import type { OpeningSpec } from "@/lib/openings/types";

/**
 * The Caro-Kann Defence (Black): 1. e4 c6 2. d4 d5.
 *
 * Lines from the coach's notes; every move checked with Stockfish 19
 * (depth 18). The trap after 4...Nd7 5. Qe2 is a side branch: in the notes'
 * main line Black plays 4...Bf5, where the trap can't happen. To add a line:
 * add a MoveSpec under the right move's `next` (first entry = main line).
 */
export const caroKann: OpeningSpec = {
  id: "caro-kann",
  name: "Caro-Kann Defence",
  playAs: "b",
  moveOrder: "1. e4 c6",
  summary: "A solid answer to 1. e4 that is hard to attack. Your bishop comes out before your pawns close it in.",
  intro:
    "Against 1. e4 you prepare ...d5 with ...c6, so if White ever takes on d5 you can take back with a pawn. The key idea: your light-squared bishop comes out BEFORE you play ...e6, so it doesn't get trapped behind your own pawns.",
  source: "Lines from the coach's notes, checked with Stockfish 19; explanations written for this app.",
  moves: [
    {
      san: "e4",
      explanation: "White puts a pawn in the centre.",
      next: [
        {
          san: "c6",
          explanation:
            "The Caro-Kann. This quiet pawn move prepares ...d5: the c6 pawn will support it, so you can always take back on d5 with a pawn.",
          tags: ["main line"],
          next: [
            {
              san: "d4",
              explanation: "White builds a big centre with two pawns.",
              next: [
                {
                  san: "d5",
                  explanation: "You challenge White's e4 pawn. White must now decide: push it, take on d5, or protect it.",
                  tags: ["central break"],
                  next: [
                    {
                      san: "Nc3",
                      name: "Classical",
                      explanation: "White protects e4 with the knight.",
                      next: [
                        {
                          san: "dxe4",
                          explanation: "You take the pawn. White will take back with the knight.",
                          next: [
                            {
                              san: "Nxe4",
                              explanation: "White's knight takes back and stands proudly in the centre.",
                              next: [
                                {
                                  san: "Bf5",
                                  explanation:
                                    "The key idea of the whole opening: your light-squared bishop comes out BEFORE ...e6, and attacks the knight on e4.",
                                  tags: ["developing move"],
                                  next: [
                                    {
                                      san: "Ng3",
                                      explanation: "The knight escapes and attacks your bishop.",
                                      next: [
                                        {
                                          san: "Bg6",
                                          explanation: "The bishop steps back to a safe diagonal, still aiming at White's side of the board.",
                                          next: [
                                            {
                                              san: "h4",
                                              explanation:
                                                "White threatens h5, which would chase your bishop off its good diagonal. What do you do?",
                                              next: [
                                                {
                                                  san: "h6",
                                                  explanation:
                                                    "Now the h7 square is empty, so when White plays h5 your bishop can hide on h7 and stay on its diagonal.",
                                                  next: [
                                                    {
                                                      san: "Nf3",
                                                      explanation: "White develops a knight.",
                                                      next: [
                                                        {
                                                          san: "Nd7",
                                                          explanation:
                                                            "You develop a knight. From d7 it stops White's knight from settling on e5.",
                                                          tags: ["developing move"],
                                                          next: [
                                                            {
                                                              san: "h5",
                                                              explanation: "White pushes on and attacks your bishop.",
                                                              next: [
                                                                {
                                                                  san: "Bh7",
                                                                  explanation: "Your bishop hides on h7, the square ...h6 prepared.",
                                                                  next: [
                                                                    {
                                                                      san: "Bd3",
                                                                      explanation: "White offers to trade bishops.",
                                                                      next: [
                                                                        {
                                                                          san: "Bxd3",
                                                                          explanation:
                                                                            "Trade off White's attacking bishop. Without it, White has fewer ways to attack your king.",
                                                                          next: [
                                                                            {
                                                                              san: "Qxd3",
                                                                              explanation: "White's queen takes back.",
                                                                              next: [
                                                                                {
                                                                                  san: "e6",
                                                                                  explanation:
                                                                                    "NOW you play ...e6: your bishop is already out, so nothing gets trapped. Next: ...Ngf6, ...Be7 or ...Bd6, and castle. A solid position that is hard to break.",
                                                                                  verdict: "slightly better for White",
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
                                                {
                                                  san: "Nd7",
                                                  name: "Classical: forgetting ...h6",
                                                  explanation:
                                                    "This ignores White's threat. After h5 the bishop has no safe square on its diagonal, because your own pawn still sits on h7.",
                                                  tags: ["mistake"],
                                                  next: [
                                                    {
                                                      san: "h5",
                                                      explanation: "The bishop is attacked and must leave its diagonal.",
                                                      next: [
                                                        {
                                                          san: "Bf5",
                                                          explanation: "The only safe square, but White's knight is waiting.",
                                                          next: [
                                                            {
                                                              san: "Nxf5",
                                                              explanation:
                                                                "White wins your good bishop for a knight and has the bishop pair and more space. That is why ...h6 was needed.",
                                                              verdict: "clearly better for White",
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
                                  san: "Nd7",
                                  name: "Classical: 4...Nd7",
                                  explanation:
                                    "Another good move: the knight prepares ...Ngf6, so that if White trades knights you can take back with a knight. But for a moment it blocks your bishop on c8. Watch out for a trap.",
                                  next: [
                                    {
                                      san: "Nf3",
                                      explanation: "White develops normally.",
                                      next: [
                                        {
                                          san: "Ngf6",
                                          explanation: "Now your other knight comes out and challenges White's knight on e4.",
                                          next: [
                                            {
                                              san: "Nxf6+",
                                              explanation: "White trades knights, with check.",
                                              next: [
                                                {
                                                  san: "Nxf6",
                                                  explanation: "Take back with the knight. Your pieces are developing smoothly.",
                                                  alsoGood: [
                                                    {
                                                      san: "exf6",
                                                      note: "Taking with the pawn is fine too: it opens lines for your pieces.",
                                                    },
                                                  ],
                                                  verdict: "slightly better for White",
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      san: "Qe2",
                                      name: "Trap: 5. Qe2, the safe answer",
                                      explanation:
                                        "A sneaky move. White's queen lines up on the e-file with your king behind the e7 pawn. What does it threaten?",
                                      tags: ["trap"],
                                      next: [
                                        {
                                          san: "Ndf6",
                                          explanation:
                                            "The safe way: the d7 knight challenges White's knight, and with d7 now empty your queen guards d6, so a knight check there would just lose the knight. The rule: don't leave your e7 pawn pinned while a white knight can jump to d6.",
                                          verdict: "slightly better for White",
                                          next: [
                                            {
                                              san: "Nxf6+",
                                              explanation: "White trades knights.",
                                              next: [
                                                {
                                                  san: "Nxf6",
                                                  explanation: "Take back. You are safe and developing.",
                                                  verdict: "equal",
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        {
                                          san: "Ngf6",
                                          name: "Trap: 5...Ngf6?? walks into mate",
                                          explanation:
                                            "This looks natural, but it walks into checkmate: the e7 pawn is pinned by the queen on e2, so it can't take a knight on d6.",
                                          tags: ["mistake"],
                                          next: [
                                            {
                                              san: "Nd6#",
                                              explanation:
                                                "Checkmate! The knight checks the king, the e7 pawn can't take it because of the pin, and the king has no square to go to. Learn this pattern so it never happens to you.",
                                              tags: ["checkmate"],
                                              verdict: "winning for White",
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
                      san: "e5",
                      name: "Advance",
                      explanation: "White pushes past your d5 pawn and grabs space.",
                      next: [
                        {
                          san: "Bf5",
                          explanation: "Again: the bishop comes out first, before ...e6 closes it in.",
                          tags: ["developing move"],
                          next: [
                            {
                              san: "Nf3",
                              explanation: "White develops a knight.",
                              next: [
                                {
                                  san: "e6",
                                  explanation: "Now that the bishop is out, ...e6 is safe. It opens the way for your other bishop.",
                                  next: [
                                    {
                                      san: "Be2",
                                      explanation: "White develops calmly and prepares to castle.",
                                      next: [
                                        {
                                          san: "c5",
                                          explanation:
                                            "Strike back at the base of White's pawn chain, the d4 pawn. In the Advance, this is the plan: attack the centre from the side.",
                                          tags: ["central break"],
                                          next: [
                                            {
                                              san: "Be3",
                                              explanation: "White protects d4 with the bishop.",
                                              next: [
                                                {
                                                  san: "cxd4",
                                                  explanation: "Trade pawns to open the c-file for your rook later.",
                                                  next: [
                                                    {
                                                      san: "Nxd4",
                                                      explanation: "White's knight takes back.",
                                                      next: [
                                                        {
                                                          san: "Ne7",
                                                          explanation:
                                                            "Develop the knight. On e7 it doesn't block anything and can go to c6 or g6 later. You'll be a little cramped, but your position is hard to break.",
                                                          tags: ["developing move"],
                                                          verdict: "slightly better for White",
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
                    {
                      san: "exd5",
                      name: "Exchange",
                      explanation: "White trades pawns in the centre.",
                      next: [
                        {
                          san: "cxd5",
                          explanation: "Take back with the c-pawn. That's why you played ...c6: you keep a pawn in the centre.",
                          next: [
                            {
                              san: "Bd3",
                              explanation: "White develops and aims a bishop at your kingside.",
                              next: [
                                {
                                  san: "Nc6",
                                  explanation: "Develop a knight and put pressure on d4.",
                                  tags: ["developing move"],
                                  next: [
                                    {
                                      san: "c3",
                                      explanation: "White protects d4 with a pawn.",
                                      next: [
                                        {
                                          san: "Nf6",
                                          explanation: "Develop the other knight.",
                                          tags: ["developing move"],
                                          next: [
                                            {
                                              san: "Bf4",
                                              explanation: "White develops the bishop to an active square.",
                                              next: [
                                                {
                                                  san: "Bg4",
                                                  explanation:
                                                    "Your bishop comes out, again before ...e6, and attacks White's queen on d1. White usually answers with Qb3, moving the queen and attacking your b7 pawn at the same time.",
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
                              san: "c4",
                              name: "Exchange: Panov Attack",
                              explanation:
                                "The Panov: a sharper try. White attacks your d5 pawn at once. You can study this one in more depth later.",
                              next: [
                                {
                                  san: "Nf6",
                                  explanation: "Develop and protect d5.",
                                  tags: ["developing move"],
                                  next: [
                                    {
                                      san: "Nc3",
                                      explanation: "White adds another attacker on d5.",
                                      next: [
                                        {
                                          san: "e6",
                                          explanation: "Protect d5 with a pawn. Solid and simple.",
                                          alsoGood: [
                                            { san: "Nc6", note: "Nc6 is just as good: develop and attack d4." },
                                            { san: "g6", note: "g6 is fine too: your bishop will go to g7." },
                                          ],
                                          verdict: "slightly better for White",
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
