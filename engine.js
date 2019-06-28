
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
    this.nbBlueToken = 21;
    this.lastPlayerWhoPlayed = undefined;
    this.winner = undefined;

    this.RED_PLAYER_ID = 'red';
    this.BLUE_PLAYER_ID = 'blue';
    this.EMPTY_BOX = 0;
  }

  hasEnoughToken(currentPlayer) {
    const playerPoint = (currentPlayer === this.RED_PLAYER_ID) ? this.nbRedToken : this.nbBlueToken;

    return playerPoint > 0;
  }

  isYourTurn(currentPlayer) {
    return this.lastPlayerWhoPlayed !== currentPlayer;
  }

  play(playerId, humanColumnNumber) {
    if (humanColumnNumber < 1 || humanColumnNumber > 7) {
      throw new Error(`The column number must be between 1 and 7!`);
    }

    const playerExist = playerId === this.RED_PLAYER_ID || playerId === this.BLUE_PLAYER_ID;
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
          this.nbBlueToken -= 1;
        }

        hasPlayed = true;
        this.lastPlayerWhoPlayed = playerId;
      }

      return currentRow;
    });

    this.board = newBoard;
  }

  getBoard() {
    return [...this.board];
  }

  getPlayers() {
    return [this.RED_PLAYER_ID, this.BLUE_PLAYER_ID];
  }

  getTokens() {
    return {
      [this.RED_PLAYER_ID]: this.nbRedToken,
      [this.BLUE_PLAYER_ID]: this.nbBlueToken
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