let setIntervalId;

document.addEventListener("DOMContentLoaded", function () {
  start();
});

const start = () => {
  refreshBoard();
  setIntervalId = setInterval(refreshBoard, 2000);
}

const refreshBoard = () => {
  fetch('/game/status')
    .then(response => response.json())
    .then(statusGame => {
      updateBoard(statusGame);
    });
}

const updateBoard = ({ board, players, winner, lastPlayerWhoPlayed }) => {
  renderBoard(board);
  renderPossibilities({ board, players, lastPlayerWhoPlayed });

  const gameIsEnd = players.some(player => player === winner);
  if (gameIsEnd) {
    alert(`Winner : ${winner}`);

    clearInterval(setIntervalId);
    return;
  }
}

const renderBoard = matrix => {
  const rowClassName = 'row';
  const columnClassName = 'column token';

  const boardElem = document.querySelector("#board");
  boardElem.innerHTML = '';

  matrix.forEach((row, rowIndex) => {
    const rowElem = document.createElement('div');

    rowElem.className = rowClassName;

    row.forEach((colum, columnIndex) => {
      const columnElem = document.createElement('div');
      const hasToken = colum !== 0;

      columnElem.className = columnClassName;
      columnElem.dataset.row = rowIndex;
      columnElem.dataset.column = columnIndex;

      if (hasToken) {
        const tokenType = colum;
        columnElem.classList.add(`${tokenType}-token`);
      }

      rowElem.appendChild(columnElem);
    });

    boardElem.appendChild(rowElem)
  });

  console.log('updated !');
}


const renderPossibilities = ({ board, players, lastPlayerWhoPlayed }) => {
  const placeholderTokenClassName = 'token';
  const posElem = document.querySelector('#control-panel');
  posElem.innerHTML = '';

  const nbPossibilities = board[0].length;
  const nexPlayer = players.filter(player => player != lastPlayerWhoPlayed)[0];
  for (let i = 0; i < nbPossibilities; ++i) {
    const tokenElem = document.createElement('div');

    tokenElem.className = placeholderTokenClassName;
    tokenElem.addEventListener('click', () => {
      const urlSearchParams = new URLSearchParams();

      urlSearchParams.append('playerid', nexPlayer);
      urlSearchParams.append('column', i + 1);

      const url = `/game/play?${urlSearchParams.toString()}`;
      fetch(url)
        .then(response => response.json())
        .then(statusGame => {
          updateBoard(statusGame);
        });
    })

    posElem.appendChild(tokenElem);
    posElem.className = `current-plyer-is-${nexPlayer}`;
  }
}