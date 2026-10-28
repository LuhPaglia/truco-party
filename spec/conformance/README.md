# Fixtures de conformidade

Especificação executável das regras. Cada `.json` descreve uma mão com cartas definidas, uma sequência de ações e o estado esperado.
Hoje elas rodam contra o motor TypeScript (`libs/engine/src/lib/conformance.spec.ts`). Quando o backend Java existir, ele precisa
de um runner equivalente e passar nas mesmas fixtures — é isso que garante que cliente e servidor jogam o mesmo truco.

## Formato

```jsonc
{
  "name": "07-truco-aceito-vale-3",
  "description": "Truco aceito: a mão vale 3.",
  "ruleSet": "paulista",
  "options": {},                       // sobrescreve TrucoOptions (regras opcionais)
  "setup": {
    "dealer": 3,                       // assento 0 é "mão"
    "score": [0, 0],
    "vira": "3o",
    "hands": [["4p", "5o", "6o"], ...] // assentos 0..3; dupla = assento % 2
  },
  "actions": [
    { "type": "RAISE", "seat": 0 },
    { "type": "PLAY_CARD", "seat": 0, "card": "4p", "covered": false },
    { "type": "RAISE", "seat": 2, "expectError": true } // deve ser rejeitada, sem alterar o estado
  ],
  "expect": { "phase": "handOver", "score": [0, 3] }
}
```

**Cartas:** rank (`4 5 6 7 Q J K A 2 3`) + naipe (`o` ouros, `e` espadas, `c` copas, `p` paus). `PLAY_CARD.card` é traduzido para a posição na mão atual do assento.

**Ações:** `PLAY_CARD`, `RAISE` (pedir truco / aumentar), `ACCEPT`, `RUN`, `ELEVEN_PLAY`, `ELEVEN_RUN`, `NEXT_HAND`, `NEXT_GAME`.

**Chaves de `expect`** (todas opcionais): `phase`, `score`, `gamesWon`, `matchWinner`, `dealer`, `currentSeat`, `value`,
`pendingValue`, `special`, `roundWinners` (`0`, `1` ou `"tie"`), `result` (comparação parcial de `{winner, points, reason}`).
