// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pageHtml from './index.html?raw';

/** The address of the site, which the link preview card points to. */
const SITE_URL = 'https://connect-four.issoufi.fr/';
const PAGE_TITLE = 'Puissance 4';
const PAGE_DESCRIPTION = 'Jouez au Puissance 4 à deux dans le navigateur : '
  + 'alignez quatre jetons de votre couleur avant votre adversaire.';
/** The image of the card, in `public/`, which the site serves at its root. */
const PREVIEW_IMAGE = 'preview.png';
/** The size that link previews show without cropping, in pixels. */
const PREVIEW_WIDTH_PX = 1200;
const PREVIEW_HEIGHT_PX = 630;
/** The first bytes of every PNG file. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Where the width and the height sit in a PNG file: in its first chunk, `IHDR`. */
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

const page = new DOMParser().parseFromString(pageHtml, 'text/html');

/**
 * Reads the `content` of a meta tag of the page.
 * @param {string} selector - The CSS selector of the tag.
 * @returns {string | undefined} Its content, or undefined when the page has no such tag.
 */
const readMeta = (selector) => page.head.querySelector(selector)?.getAttribute('content')
  ?? undefined;

const readOpenGraph = (property) => readMeta(`meta[property="${property}"]`);

describe('readMeta', () => {
  it('reads the content of a tag of the head', () => {
    expect(readMeta('meta[name="viewport"]')).toBe('width=device-width, initial-scale=1.0');
  });

  it('answers undefined for a tag without content, or that the page does not have', () => {
    expect(readMeta('meta[charset]')).toBeUndefined();
    expect(readMeta('meta[name="keywords"]')).toBeUndefined();
    expect(readOpenGraph('')).toBeUndefined();
  });
});

describe('the head of the page', () => {
  it('describes the page in French for search engines', () => {
    expect(page.documentElement.lang).toBe('fr');
    expect(page.title).toBe(PAGE_TITLE);
    expect(readMeta('meta[name="description"]')).toBe(PAGE_DESCRIPTION);
  });

  it('gives a link preview card the title, the description and the address of the site', () => {
    expect(readOpenGraph('og:type')).toBe('website');
    expect(readOpenGraph('og:title')).toBe(PAGE_TITLE);
    expect(readOpenGraph('og:description')).toBe(PAGE_DESCRIPTION);
    expect(readOpenGraph('og:url')).toBe(SITE_URL);
  });

  it('points the card to an image of the site, described for screen readers', () => {
    const image = new URL(readOpenGraph('og:image'));

    expect(image.origin).toBe(new URL(SITE_URL).origin);
    expect(image.pathname).toBe(`/${PREVIEW_IMAGE}`);
    expect(readOpenGraph('og:image:alt')).toMatch(/plateau/i);
    expect(readOpenGraph('og:image:width')).toBe(String(PREVIEW_WIDTH_PX));
    expect(readOpenGraph('og:image:height')).toBe(String(PREVIEW_HEIGHT_PX));
  });

  it('serves from `public/` a PNG image of the size that the card announces', () => {
    const image = readFileSync(new URL(PREVIEW_IMAGE, import.meta.url));

    expect([...image.subarray(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);
    expect(image.readUInt32BE(PNG_WIDTH_OFFSET)).toBe(PREVIEW_WIDTH_PX);
    expect(image.readUInt32BE(PNG_HEIGHT_OFFSET)).toBe(PREVIEW_HEIGHT_PX);
  });

  it('no longer sets the obsolete X-UA-Compatible header of Internet Explorer', () => {
    expect(page.head.querySelector('meta[http-equiv]')).toBeNull();
    expect(pageHtml).not.toMatch(/X-UA-Compatible/i);
  });
});
