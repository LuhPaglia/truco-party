# Truco Party

Jogo de truco web responsivo (desktop e mobile), single player 2x2 contra NPCs. Multiplayer e lojas virão depois.

## Estrutura

| Projeto | O que é |
|---|---|
| `apps/web` | App Angular (standalone, zoneless, SCSS, PWA). Tela inicial (`home/`), mesa 2x2 (`table/`) e `GameController` (motor + bots + ritmo). Futuro: Capacitor. |
| `libs/engine` | Motor de regras em TS puro: estado, ações, reducer, `getPlayerView`. Sem dependências. |
| `libs/ai` | NPCs (`createBot`) por modalidade, dificuldade e personalidade, + `simulateMatch`. |
| `libs/ui-game` | Componentes visuais reutilizáveis: carta (`truco-card`) e placar. |
| `libs/monetization` | Contrato `AdProvider` (AdSense for Games / AdMob entram depois). |
| `spec/conformance` | Fixtures JSON das regras: contrato entre o motor TS e o futuro backend Java. |

Modalidades: **Paulista** disponível; Mineiro e Gaúcho previstos em `MODES` (`libs/engine/src/lib/rulesets/registry.ts`).
Para liberar uma modalidade: `RuleSet` no engine + `TrucoStrategy` na IA + fixtures em `spec/conformance/<modalidade>`.

Regras opcionais do Paulista: `TrucoOptions` em `libs/engine/src/lib/ruleset.ts` (padrões em `rulesets/paulista.ts`).

## Comandos

```bash
npm start                                  # app web em dev
npm test                                   # todos os testes
npx nx run-many -t test lint typecheck build
npm run simulate -- 500                    # estatísticas de 500 disputas entre bots
npm run simulate -- 1 --verbose            # narra uma disputa jogada a jogada
npm run simulate -- 500 --vs=easy:medium   # dupla 0 fácil x dupla 1 médio
```
