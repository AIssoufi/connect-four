// @vitest-environment jsdom
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { SELECTORS, TAB_INDEX } from './constants.js';

/** The number of column buttons of the control panel of these tests. */
const COLUMN_COUNT = 3;

/** The `tabindex` of each column button when the Tab key reaches the column at each index. */
const TAB_INDEXES_BY_FOCUSED_COLUMN = Array.from(
  { length: COLUMN_COUNT },
  (focused, focusedIndex) => Array.from({ length: COLUMN_COUNT }, (column, columnIndex) => String(
    columnIndex === focusedIndex ? TAB_INDEX.reachable : TAB_INDEX.skipped,
  )),
);

/** The module under test, loaded again before each test so that its focused column is reset. */
let keyboard;

/** @returns {HTMLElement} The control panel. */
const getPanel = () => document.querySelector(SELECTORS.controlPanel);

/** @returns {HTMLButtonElement[]} The column buttons of the control panel. */
const getPickers = () => Array.from(getPanel().children);

/** @returns {string[]} The `tabindex` of each column button, left column first. */
const getTabIndexes = () => getPickers().map((pickerElem) => pickerElem.getAttribute('tabindex'));

/**
 * Presses a key on the focused element, as a keyboard does.
 * @param {KeyboardEventInit} init - The key and its modifiers.
 * @returns {KeyboardEvent} The event, to check whether the module cancelled it.
 */
const pressKey = (init) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  document.activeElement.dispatchEvent(event);
  return event;
};

/**
 * Draws a control panel of column buttons, each holding a token, and listens to its focus and
 * its key presses with the handlers of the module.
 * @param {number} columnCount - The number of column buttons.
 */
const drawPanel = (columnCount) => {
  const buttons = Array.from({ length: columnCount }, (column, columnIndex) => (
    `<button type="button" data-column="${columnIndex}" tabindex="-1"><span></span></button>`
  ));
  document.body.innerHTML = `<div id="control-panel">${buttons.join('')}</div><p>Text</p>`;
  getPanel().addEventListener('focusin', keyboard.onControlPanelFocusIn);
  getPanel().addEventListener('keydown', keyboard.onControlPanelKeyDown);
};

beforeEach(async () => {
  vi.resetModules();
  keyboard = await import('./keyboard.js');
  drawPanel(COLUMN_COUNT);
});

describe('getFocusedColumnIndex', () => {
  it('starts on the first column', () => {
    expect(keyboard.getFocusedColumnIndex(COLUMN_COUNT)).toBe(0);
  });

  it('gives the column focused last while the board has it', () => {
    getPickers()[2].focus();

    expect(keyboard.getFocusedColumnIndex(COLUMN_COUNT)).toBe(2);
    expect(keyboard.getFocusedColumnIndex(COLUMN_COUNT + 1)).toBe(2);
  });

  it.each([2, 1, 0, -1, Number.NaN, undefined])(
    'goes back to the first column for a board of %s columns, which has no third column',
    (columnCount) => {
      getPickers()[2].focus();

      expect(keyboard.getFocusedColumnIndex(columnCount)).toBe(0);
      expect(keyboard.getFocusedColumnIndex(COLUMN_COUNT)).toBe(0);
    },
  );
});

describe('onControlPanelFocusIn', () => {
  it('makes the focused column the only one that the Tab key reaches', () => {
    getPickers()[1].focus();

    expect(getTabIndexes()).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[1]);
  });

  it('finds the column of a focused element inside its button', () => {
    const tokenElem = getPickers()[2].firstElementChild;
    tokenElem.setAttribute('tabindex', TAB_INDEX.skipped);

    tokenElem.focus();

    expect(getTabIndexes()).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[2]);
    expect(keyboard.getFocusedColumnIndex(COLUMN_COUNT)).toBe(2);
  });

  it('changes nothing for a focus on the panel itself, outside any column button', () => {
    getPanel().setAttribute('tabindex', TAB_INDEX.skipped);
    getPickers()[1].focus();

    getPanel().focus();

    expect(getTabIndexes()).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[1]);
    expect(keyboard.getFocusedColumnIndex(COLUMN_COUNT)).toBe(1);
  });
});

describe('onControlPanelKeyDown', () => {
  it.each([
    { key: 'ArrowRight', fromIndex: 0, toIndex: 1 },
    { key: 'ArrowRight', fromIndex: 2, toIndex: 0 },
    { key: 'ArrowLeft', fromIndex: 1, toIndex: 0 },
    { key: 'ArrowLeft', fromIndex: 0, toIndex: 2 },
    { key: 'Home', fromIndex: 2, toIndex: 0 },
    { key: 'End', fromIndex: 0, toIndex: 2 },
  ])('$key moves the focus from column $fromIndex to $toIndex', ({ key, fromIndex, toIndex }) => {
    getPickers()[fromIndex].focus();

    const event = pressKey({ key });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(getPickers()[toIndex]);
    expect(getTabIndexes()).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[toIndex]);
  });

  it.each([
    { key: 'ArrowRight', altKey: true },
    { key: 'ArrowLeft', ctrlKey: true },
    { key: 'End', metaKey: true },
    { key: 'ArrowUp' },
    { key: 'Tab' },
    { key: 'a' },
    { key: '' },
  ])('leaves the key press %o to the browser', (init) => {
    getPickers()[1].focus();

    const event = pressKey(init);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(getPickers()[1]);
  });

  it('leaves the key press to the browser when the panel has no column button', () => {
    drawPanel(0);
    getPanel().setAttribute('tabindex', TAB_INDEX.skipped);
    getPanel().focus();

    const event = pressKey({ key: 'End' });

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(getPanel());
  });
});
