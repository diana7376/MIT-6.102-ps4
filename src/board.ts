import fs from 'fs/promises';


type CardState = 'face-down' | 'revealed' | 'matched';

export interface Card {
  value: string;
  state: CardState;
  controlledBy?: string;
}

export interface PublicCard {
  value: string | null;
  state: CardState;
  controlledBy?: string;
}

export class Board {
  private rows: number;
  private cols: number;
  private board: Card[][];

  constructor(rows: number, cols: number, cards: string[]) {
    this.rows = rows;
    this.cols = cols;

    const shuffled = [...cards];
    shuffled.sort(() => Math.random() - 0.5);

    this.board = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const row: Card[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          value: shuffled[idx++] || '',
          state: 'face-down'
        });
      }
      this.board.push(row);
    }
    this.checkRep();
  }

  private checkRep() {
    if (this.board.length !== this.rows) throw new Error("Invalid row count");
    for (const row of this.board) {
      if (row.length !== this.cols) throw new Error("Invalid column count");
    }
  }

  private isValid(r: number, c: number) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  public flip(row: number, col: number, player: string): { success: boolean; message: string; boardView: PublicCard[][] } {
    const r = row - 1;
    const c = col - 1;
    const rowArr = this.board[r];
    if (!rowArr) {
      return { success: false, message: "Row out of bounds", boardView: this.look(player) };
    }
    const card = rowArr[c];
    if (!card) {
      return { success: false, message: "Column out of bounds", boardView: this.look(player) };
    }
    if (card.state !== 'face-down') {
      return { success: false, message: "Cannot flip", boardView: this.look(player) };
    }
    card.state = 'revealed';
    card.controlledBy = player;

    // Find all currently revealed cards for this player
    const revealed: { r: number; c: number; value: string }[] = [];
    for (let rr = 0; rr < this.rows; rr++) {
      const checkRow = this.board[rr];
      if (!checkRow) continue;
      for (let cc = 0; cc < this.cols; cc++) {
        const check = checkRow[cc];
        if (check && check.state === 'revealed' && check.controlledBy === player) {
          revealed.push({ r: rr, c: cc, value: check.value });
        }
      }
    }

    if (revealed.length === 2) {
      const card1 = revealed[0];
      const card2 = revealed[1];
      if (card1 && card2 && card1.value === card2.value) {
        // Match: set both as matched (safe access)
        for (const rc of revealed) {
          const matchedRow = this.board[rc.r];
          if (!matchedRow) continue;
          const matchedCard = matchedRow[rc.c];
          if (!matchedCard) continue;
          matchedCard.state = 'matched';
          matchedCard.controlledBy = undefined;
        }
        this.checkRep();
        return { success: true, message: "Match!", boardView: this.look(player) };
      } else {
        // Not a match: flip both back (safe access)
        for (const rc of revealed) {
          const flipRow = this.board[rc.r];
          if (!flipRow) continue;
          const flipCard = flipRow[rc.c];
          if (!flipCard) continue;
          flipCard.state = 'face-down';
          flipCard.controlledBy = undefined;
        }
        this.checkRep();
        return { success: true, message: "Not a match.", boardView: this.look(player) };
      }
    }

    this.checkRep();
    return { success: true, message: "Card flipped", boardView: this.look(player) };
  }

  public look(player: string): PublicCard[][] {
    return this.board.map(row =>
        row.map(card => {
            if (!card) return { value: null, state: 'face-down' };
            if (card.state === 'matched') {
                return { value: card.value, state: 'matched' };
            }
            if (card.state === 'revealed' && card.controlledBy === player) {
                return { value: card.value, state: 'revealed', controlledBy: player };
            }
            return { value: null, state: 'face-down' };
        })
    );
}

  public map(): PublicCard[][] {
    return this.board.map(row =>
      row.map(card => {
        if (!card) return { value: null, state: 'face-down' };
        if (card.state === 'matched' || card.state === 'revealed') {
          return { value: card.value, state: card.state };
        }
        return { value: null, state: 'face-down' };
      })
    );
  }

  public watch(callback: (state: PublicCard[][]) => void): void {
       callback(this.map());
  }
  public static async parseFromFile(filename: string): Promise<Board> {
        const data = await fs.readFile(filename, 'utf-8');
        const lines = data.trim().split('\n').map((line: string) => line.trim());
        
        if (lines.length < 1) {
            throw new Error("File must contain at least 1 line for board dimensions");
        }
        
        const dimensionsLine = lines[0];
        
        if (!dimensionsLine) {
            throw new Error("Missing board dimensions specification");
        }
        
        // Handle format like "5x5" or separate lines for rows and cols
        let rows: number, cols: number;
        
        if (dimensionsLine.includes('x')) {
            // Format: "5x5"
            const [rowsStr, colsStr] = dimensionsLine.split('x');
            if (!rowsStr || !colsStr) {
                throw new Error("Invalid dimensions format. Expected 'rowsxcols' like '5x5'");
            }
            rows = parseInt(rowsStr);
            cols = parseInt(colsStr);
        } else {
            // Format: separate lines for rows and cols
            if (lines.length < 2) {
                throw new Error("File must contain at least 2 lines for rows and columns");
            }
            const colsLine = lines[1];
            if (!colsLine) {
                throw new Error("Missing columns specification");
            }
            rows = parseInt(dimensionsLine);
            cols = parseInt(colsLine);
        }
        
        if (isNaN(rows) || isNaN(cols)) {
            throw new Error("Rows and columns must be valid numbers");
        }
        
        // Get card values from remaining lines
        const cardLines = dimensionsLine.includes('x') ? lines.slice(1) : lines.slice(2);
        const cards = cardLines.filter(line => line.length > 0);
        
        return new Board(rows, cols, cards);
    }
}
