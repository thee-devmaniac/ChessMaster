import type { OpeningSpec } from "@/lib/openings/types";

/**
 * The King's Gambit: 1. e4 e5 2. f4
 *
 * Lines follow the reference book's pages (MCO-style tables), used as
 * research only: every explanation here is our own wording. Engine checks
 * (Stockfish 19, depth 18) are mentioned where they disagree with the book.
 *
 * To add a line: add a MoveSpec under the right move's `next`. The first
 * entry in `next` is treated as the main line. Tests check that every move
 * is legal.
 */
export const kingsGambit: OpeningSpec = {
  id: "kings-gambit",
  name: "King's Gambit",
  intro:
    "One of the oldest and most aggressive openings. After 1. e4 e5, White offers a pawn with 2. f4 to open the f-file and build a big centre, at the cost of loosening the squares around the king.",
  source: "Lines from an MCO-style opening reference; explanations written for this app.",
  moves: [
    {
      san: "e4",
      explanation:
        "White puts a pawn in the centre. It controls d5 and f5, and opens paths for the queen and the light-squared bishop.",
      next: [
        {
          san: "e5",
          explanation: "Black does the same, claiming an equal share of the centre.",
          next: [
            {
              san: "f4",
              name: "King's Gambit",
              tags: ["gambit"],
              explanation:
                "The King's Gambit. White offers the f-pawn. If Black takes it, White hopes to play d4 for a big pawn centre and later use the open f-file for a rook. The price: with the f-pawn gone, the diagonal from h4 to e1 is open, so White's king is a little exposed. Modern engines rate it slightly risky for White, but at club level it is very playable.",
              next: [
                // ---------------- Falkbeer Counter-Gambit (the line taught first) ----------------
                {
                  san: "d5",
                  name: "Falkbeer Counter-Gambit",
                  tags: ["counter-gambit", "central break"],
                  explanation:
                    "Instead of taking the pawn, Black strikes back in the centre straight away, ready to give up a pawn of their own to open the position while White's king is loose.",
                  next: [
                    {
                      san: "exd5",
                      explanation: "White takes the pawn. This is the usual reply.",
                      next: [
                        {
                          san: "e4",
                          tags: ["main line"],
                          explanation:
                            "The key idea of the Falkbeer. Black does not recapture on d5 but pushes the e-pawn forward. The pawn on e4 controls d3 and f3, so White's knight can't use its natural square f3, and White's pieces get in each other's way.",
                          next: [
                            {
                              san: "d3",
                              tags: ["central break"],
                              explanation:
                                "White challenges the annoying e4 pawn at once, aiming to swap it off.",
                              next: [
                                {
                                  san: "Nf6",
                                  tags: ["developing move"],
                                  explanation:
                                    "Black develops a knight that defends e4 and attacks White's extra pawn on d5.",
                                  next: [
                                    {
                                      san: "Nd2",
                                      tags: ["developing move"],
                                      explanation:
                                        "The knight attacks e4 a second time. Later it can go on to b3.",
                                      next: [
                                        {
                                          san: "exd3",
                                          explanation:
                                            "Black exchanges the e4 pawn rather than let White win it, which opens lines for Black's pieces.",
                                          next: [
                                            {
                                              san: "Bxd3",
                                              tags: ["developing move"],
                                              explanation:
                                                "White takes back and develops the bishop, which now points towards Black's kingside.",
                                              next: [
                                                {
                                                  san: "Nxd5",
                                                  explanation:
                                                    "Black wins back the gambit pawn, so material is equal again. The knight is strong in the centre.",
                                                  next: [
                                                    {
                                                      san: "Qf3",
                                                      explanation:
                                                        "The queen attacks the knight on d5 and joins the game.",
                                                      next: [
                                                        {
                                                          san: "Nc6",
                                                          tags: ["developing move"],
                                                          explanation:
                                                            "Black brings out another piece. The knight on d5 doesn't need to move: the queen on d8 defends it along the open d-file.",
                                                          next: [
                                                            {
                                                              san: "a3",
                                                              explanation:
                                                                "A quiet but useful move. It takes b4 away from Black's knights, so neither can jump there to attack the bishop on d3.",
                                                              next: [
                                                                {
                                                                  san: "Bc5",
                                                                  tags: ["developing move"],
                                                                  explanation:
                                                                    "The bishop takes an active diagonal pointing at g1. While it stays there, White will find it hard to castle kingside.",
                                                                  next: [
                                                                    {
                                                                      san: "Ne2",
                                                                      tags: ["developing move"],
                                                                      explanation:
                                                                        "White develops the last kingside piece. The knight goes to e2 because the queen is already on f3.",
                                                                      next: [
                                                                        {
                                                                          san: "O-O",
                                                                          tags: ["castling"],
                                                                          explanation:
                                                                            "Black castles: the king is safe, and the rook comes towards the centre.",
                                                                          next: [
                                                                            {
                                                                              san: "Nb3",
                                                                              explanation:
                                                                                "The knight attacks the bishop on c5 to push it off its strong diagonal.",
                                                                              next: [
                                                                                {
                                                                                  san: "Be7",
                                                                                  verdict: "equal",
                                                                                  tags: ["main line"],
                                                                                  explanation:
                                                                                    "The bishop steps back. The book rates this position as equal: material is level and both sides have developed most of their pieces, though White's king is still in the centre. Stockfish today gives White a small edge here (about +0.9), a reminder that opening books get revised as engines improve.",
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
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          san: "c6",
                          name: "Nimzowitsch Counter-Gambit",
                          tags: ["counter-gambit"],
                          explanation:
                            "Black offers a second pawn instead of recapturing on d5. If White takes it, Black gets quick development and open lines for the pieces. This module doesn't go further into this line yet.",
                        },
                      ],
                    },
                    {
                      san: "Nf3",
                      name: "Falkbeer with 3. Nf3",
                      tags: ["developing move"],
                      explanation:
                        "White develops instead of taking on d5. A quieter choice that avoids the sharp main line. This module doesn't go further into this line yet.",
                    },
                  ],
                },
                // ---------------- King's Gambit Declined with 2...Bc5 ----------------
                {
                  san: "Bc5",
                  name: "King's Gambit Declined",
                  tags: ["developing move"],
                  explanation:
                    "Black declines the pawn and develops the bishop to a diagonal aimed at g1. While it stays there, White will find it hard to castle kingside. It also sets a trap: see 3. fxe5?",
                  next: [
                    {
                      san: "Nf3",
                      tags: ["developing move", "main line"],
                      explanation:
                        "The best reply. White develops, attacks the e5 pawn, and guards h4, so Black's queen can't give check there.",
                      next: [
                        {
                          san: "d6",
                          tags: ["main line"],
                          explanation:
                            "Black protects e5 with another pawn: a solid set-up that keeps a firm foothold in the centre. This module doesn't go further into this line yet.",
                        },
                      ],
                    },
                    {
                      san: "fxe5",
                      name: "Trap: 3. fxe5?",
                      tags: ["trap", "mistake"],
                      verdict: "winning for Black",
                      explanation:
                        "A natural-looking mistake. White grabs the pawn, but this opens the h4–e1 diagonal for Black's queen. Can you see Black's reply?",
                      next: [
                        {
                          san: "Qh4+",
                          explanation:
                            "Check! White has only two replies, and both lose: 4. Ke2 allows checkmate, and 4. g3 loses the rook on h1.",
                          next: [
                            {
                              san: "g3",
                              name: "Trap: 3. fxe5? Qh4+ 4. g3",
                              explanation: "Blocking the check with the pawn is the only way to avoid mate.",
                              next: [
                                {
                                  san: "Qxe4+",
                                  tags: ["fork"],
                                  explanation:
                                    "A fork: the queen gives check and attacks the rook on h1 at the same time. White must deal with the check first.",
                                  next: [
                                    {
                                      san: "Qe2",
                                      explanation: "White blocks the check, offering a queen trade.",
                                      next: [
                                        {
                                          san: "Qxh1",
                                          verdict: "winning for Black",
                                          explanation:
                                            "Black takes the rook. Black is a whole rook ahead: Stockfish rates the position about −4.",
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              san: "Ke2",
                              name: "Trap: 3. fxe5? Qh4+ 4. Ke2",
                              tags: ["mistake"],
                              explanation: "Walking the king forward loses at once.",
                              next: [
                                {
                                  san: "Qxe4#",
                                  tags: ["checkmate"],
                                  verdict: "winning for Black",
                                  explanation:
                                    "Checkmate. The queen checks the king, and every escape square is covered by the queen or the bishop on c5.",
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                // ---------------- Other replies ----------------
                {
                  san: "exf4",
                  name: "King's Gambit Accepted",
                  tags: ["gambit"],
                  explanation:
                    "Black takes the pawn. This is the most common reply and leads to sharp, tactical play. The book pages behind this module don't cover it, so it isn't explained further yet.",
                },
                {
                  san: "Nf6",
                  name: "Declined with 2...Nf6",
                  tags: ["developing move"],
                  explanation:
                    "Black develops a knight and attacks the e4 pawn, ignoring the offer on f4. A simple way to avoid the long theory of the accepted gambit. This module doesn't go further into this line yet.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
