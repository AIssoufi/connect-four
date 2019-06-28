
class Engine {
  constructor() {
    if (!Engine.instance) {
      this.init();

      Engine.instance = this;
    }

    return Engine.instance;
  }

  init() {
    this.board = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    ];

    this.nbRedToken = 21;
    this.nbYellowToken = 21;
    this.lastPlayerWhoPlayed = undefined;
    this.winner = undefined;

    this.RED_PLAYER_ID = 'red';
    this.YELLOW_PLAYER_ID = 'yellow';
    this.EMPTY_BOX = 0;
  }

  hasEnoughToken(currentPlayer) {
    const playerPoint = (currentPlayer === this.RED_PLAYER_ID) ? this.nbRedToken : this.nbYellowToken;

    return playerPoint > 0;
  }

  isYourTurn(currentPlayer) {
    return this.lastPlayerWhoPlayed !== currentPlayer;
  }

  play(playerId, humanColumnNumber) {
    if (humanColumnNumber < 1 || humanColumnNumber > 7) {
      throw new Error(`The column number must be between 1 and 7!`);
    }

    const playerExist = playerId === this.RED_PLAYER_ID || playerId === this.YELLOW_PLAYER_ID;
    if (!playerExist) throw new Error(`The player ${playerId} is unknow !`);

    const isYourTurn = this.isYourTurn(playerId);
    if (!isYourTurn) throw new Error(`${playerId}: it's not your turn !`);

    const hasEnoughToken = this.hasEnoughToken(playerId);
    if (!hasEnoughToken) throw new Error(`You do not have enough token to play!`);

    let hasPlayed = false;
    const column = humanColumnNumber - 1;
    const newBoard = this.board.map(currentRow => {
      if (hasPlayed) return currentRow;

      const box = currentRow[column];
      const boxIsEmpty = box === this.EMPTY_BOX;

      if (boxIsEmpty) {
        currentRow[column] = playerId;

        if (playerId === this.RED_PLAYER_ID) {
          this.nbRedToken -= 1;
        } else {
          this.nbYellowToken -= 1;
        }

        hasPlayed = true;
        this.lastPlayerWhoPlayed = playerId;
      }

      return currentRow;
    });

    this.board = newBoard;

    const alignmentWasFound = this.searchAlignment(playerId, this.board);
    if (alignmentWasFound) {
      this.winner = playerId;
    }
  }

  searchAlignment(currentPlayer, board) {
    const horizontalAlignmentWasFound = this.checkHorizontalAlignments(currentPlayer, board);
    const verticalAlignmentWasFound = this.checkVerticalAlignments(currentPlayer, board);

    return horizontalAlignmentWasFound || verticalAlignmentWasFound;
  }

  checkHorizontalAlignments(currentPlayer, board) {
    const allIndexesRowsOfBoard = [0, 1, 2, 3, 4, 5];
    const allIndexesColumnsNeededToCheckAlignment = [0, 1, 2, 3];

    const alignmentWasFound = allIndexesRowsOfBoard.some(startRow =>
      allIndexesColumnsNeededToCheckAlignment.some(
        startColumn => this.checkAlignment({
          startColumn,
          searchedPattern: currentPlayer,
          array: board[startRow]
        })
      )
    );

    return alignmentWasFound;
  }

  checkVerticalAlignments(currentPlayer, board) {
    const allIndexesColumnsOfBoard = [0, 1, 2, 3, 4, 5, 6];
    const allIndexesColumnsNeededToCheckAlignment = [0, 1, 2];

    const alignmentWasFound = allIndexesColumnsOfBoard.some(column => {
      const rowsTransformedToColumns = board.map(row => row[column]);

      return allIndexesColumnsNeededToCheckAlignment.some(
        startColumn => this.checkAlignment({
          startColumn,
          searchedPattern: currentPlayer,
          array: rowsTransformedToColumns
        })
      );
    })

    return alignmentWasFound;
  }

  checkAlignment({ startColumn, searchedPattern, array }) {
    if (startColumn < 0 || startColumn > array.length) {
      return false;
    }

    const endColumn = startColumn + 3;
    const goodRange = endColumn <= array.length;
    if (!goodRange) { return false; }

    for (let currentColumn = startColumn; currentColumn <= endColumn; currentColumn += 1) {
      const box = array[currentColumn];
      const isPresent = box === searchedPattern;

      if (!isPresent) { return false; }
    }

    return true;
  }

  getBoard() {
    return [...this.board];
  }

  getPlayers() {
    return [this.RED_PLAYER_ID, this.YELLOW_PLAYER_ID];
  }

  getTokens() {
    return {
      [this.RED_PLAYER_ID]: this.nbRedToken,
      [this.YELLOW_PLAYER_ID]: this.nbYellowToken
    };
  }

  getLastPlayerWhoPlayed() {
    const { lastPlayerWhoPlayed } = this;

    return lastPlayerWhoPlayed || 'nobody';
  }

  getWinner() {
    const { winner } = this;

    return winner || 'no winner';
  }

  getStatus() {
    const board = this.getBoard();
    const players = this.getPlayers();
    const tokens = this.getTokens();
    const lastPlayerWhoPlayed = this.getLastPlayerWhoPlayed();
    const winner = this.getWinner();

    return {
      players,
      tokens,
      lastPlayerWhoPlayed,
      winner,
      board: board.reverse()
    };
  }
}

module.exports = new Engine();