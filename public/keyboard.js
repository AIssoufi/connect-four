import { SELECTORS } from './constants.js';
import { getColumnTabIndex, getNextColumnIndex } from './utils.js';

/** The column button that the Tab key reaches, kept when the control panel is drawn again. */
let focusedColumnIndex = 0;

/**
 * Gives the column button that the Tab key reaches. When the board has no column at the index
 * remembered, it remembers the first column instead and gives it.
 * @param {number} columnCount - The number of columns of the board.
 * @returns {number} The index of the focused column: `0` when the count is not a number or the
 *   board has no column at the remembered index.
 */
export const getFocusedColumnIndex = (columnCount) => {
  const isFocusedColumnOnBoard = focusedColumnIndex < columnCount;
  if (!isFocusedColumnOnBoard) {
    focusedColumnIndex = 0;
  }

  return focusedColumnIndex;
};

/**
 * Makes the button of the focused column the only one that the Tab key reaches, and remembers
 * it, so that Tab comes back to the column focused last.
 * @param {FocusEvent} event - The focus entering the control panel or moving inside it.
 */
export const onControlPanelFocusIn = (event) => {
  const pickerElem = event.target.closest(SELECTORS.columnPicker);
  if (!pickerElem) {
    return;
  }

  focusedColumnIndex = Number(pickerElem.dataset.column);
  Array.from(event.currentTarget.children).forEach((buttonElem, columnIndex) => {
    const tabIndex = getColumnTabIndex({ columnIndex, focusedIndex: focusedColumnIndex });
    buttonElem.setAttribute('tabindex', tabIndex);
  });
};

/**
 * Moves the focus between the column buttons with the arrow keys, Home and End, and leaves the
 * browser shortcuts made with Alt, Ctrl or Cmd to the browser.
 * @param {KeyboardEvent} event - The key press, listened on the control panel.
 */
export const onControlPanelKeyDown = (event) => {
  const isBrowserShortcut = event.altKey || event.ctrlKey || event.metaKey;
  if (isBrowserShortcut) {
    return;
  }

  const buttonElems = event.currentTarget.children;
  const nextIndex = getNextColumnIndex({
    key: event.key, currentIndex: focusedColumnIndex, columnCount: buttonElems.length,
  });
  if (nextIndex === null) {
    return;
  }

  event.preventDefault();
  buttonElems[nextIndex].focus();
};
