import { Board } from './board.js';

/**
 * Looks at the current state of the board.
 * @param board a Memory Scramble board
 * @param playerId ID of player looking at the board
 * @returns the state of the board from the perspective of playerId
 */
export async function look(board: Board, playerId: string): Promise<any> {
  return board.look(playerId);
}

/**
 * Tries to flip over a card on the board, following the rules in the ps4 handout.
 * @param board a Memory Scramble board
 * @param playerId ID of player making the flip
 * @param row row number of card to flip (1-based)
 * @param column column number of card to flip (1-based)
 * @returns the state of the board after the flip from the perspective of playerId
 */
export async function flip(board: Board, playerId: string, row: number, column: number): Promise<any> {
  return board.flip(row, column, playerId);
}

/**
 * Modifies board by replacing every card with f(card). This should be concurrent-safe and return the board view.
 * @param board game board
 * @param playerId ID of player applying the map
 * @param f mathematical function from cards to cards (async for lab spec)
 * @returns the state of the board after the replacement from the perspective of playerId
 */
export async function map(board: Board, playerId: string, f: (card: string) => Promise<string>): Promise<any> {
  // Simple concurrent-safe map implementation:
  // Only map face-down and revealed cards for now (not matched).
  for (let r = 0; r < board['rows']; r++) {
    for (let c = 0; c < board['cols']; c++) {
      const rowArr = board['board'][r];
      if (!rowArr) continue;
      const card = rowArr[c];
      if (!card || card.state === 'matched') continue;
      card.value = await f(card.value);
    }
  }
  return board.look(playerId);
}

/**
 * Watches the board for a change, returns current state asynchronously.
 * @param board a Memory Scramble board
 * @param playerId ID of player watching the board
 * @returns the updated state of the board from the perspective of playerId
 */
export async function watch(board: Board, playerId: string): Promise<any> {
  // For demo, simply return the board; for real multiplayer, implement a subscription/wait for change.
  return board.look(playerId);
}
