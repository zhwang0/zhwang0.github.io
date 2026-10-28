// Lightweight behavior tests; visual and native dialog checks belong in a browser.
// Run: node --test scripts/test-research-spotlight.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../assets/js/research-spotlight.js'), 'utf8');

class Element {
  constructor() {
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = {};
    this.childNodes = [];
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
    };
  }
  addEventListener(name, listener) {
    this.listeners.set(name, [...(this.listeners.get(name) || []), listener]);
  }
  emit(name, properties = {}) {
    const event = {
      target: this, button: 0, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...properties,
    };
    for (const listener of this.listeners.get(name) || []) listener(event);
    return event;
  }
  querySelector(selector) { return this.children[selector] || null; }
  appendChild(element) {
    if (element.parentElement) {
      element.parentElement.childNodes = element.parentElement.childNodes.filter((child) => child !== element);
    }
    this.childNodes.push(element);
    element.parentElement = this;
    return element;
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
}

class Media extends Element {
  constructor() { super(); this.paused = true; this.playCalls = 0; this.loadCalls = 0; }
  set src(value) { this.setAttribute('src', value); }
  get src() { return this.getAttribute('src'); }
  play() {
    this.playCalls++;
    this.paused = false;
    this.emit('play');
    return Promise.resolve();
  }
  pause() {
    if (!this.paused) { this.paused = true; this.emit('pause'); }
  }
  load() { this.loadCalls++; this.paused = true; }
}

function setup(options = {}) {
  const spotlight = new Element();
  const originalParent = new Element();
  originalParent.appendChild(spotlight);
  const paper = new Element();
  let paperAvailable = Boolean(options.paperInitiallyAvailable);
  const teaser = new Media();
  teaser.setAttribute('data-src', '/assets/video/carbonglobe-teaser.mp4');
  const motion = new Element();
  motion.children.i = new Element();
  const watch = new Element();
  watch.href = 'https://zhwang0.github.io/carbon-globe-website/assets/film/carbonglobe-film.mp4';
  spotlight.children = {
    '.spotlight-teaser': teaser, '.spotlight-motion': motion, '[data-carbon-film]': watch,
  };
  const dialog = new Element();
  const film = new Media();
  const close = new Element();
  dialog.children = { '.carbon-full-film': film, '.carbon-film-close': close };
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.emit('close'); };
  dialog.getBoundingClientRect = () => ({ left: 20, top: 20, right: 300, bottom: 200 });
  const document = new Element();
  document.body = new Element();
  document.hidden = false;
  document.getElementById = (id) => {
    if (id === 'carbon-spotlight') return spotlight;
    if (id === 'carbon-globe' && paperAvailable) return paper;
    return null;
  };
  document.children = { '.carbon-film-dialog': dialog };
  const reducedMotion = new Element();
  reducedMotion.matches = Boolean(options.reducedMotion);
  const connection = new Element();
  connection.saveData = Boolean(options.saveData);
  let intersectionCallback;
  class IntersectionObserver {
    constructor(callback) { intersectionCallback = callback; }
    observe(element) { assert.equal(element, teaser); }
  }
  const window = {
    location: { hostname: options.hostname || 'localhost', search: options.search || '', hash: '' },
    matchMedia: () => reducedMotion,
    requestAnimationFrame: (callback) => callback(),
    IntersectionObserver,
  };
  vm.runInNewContext(source, {
    window, document, navigator: { connection }, IntersectionObserver, URLSearchParams,
  }, { filename: 'research-spotlight.js' });
  return {
    teaser, motion, watch, dialog, film, close, document, spotlight, paper, originalParent,
    ready: () => { paperAvailable = true; document.emit('homepage:publications-ready'); },
    intersect: (visible) => intersectionCallback([{ isIntersecting: visible }]),
  };
}

test('teaser requests no video before entering the viewport', () => {
  const page = setup();
  assert.equal(page.teaser.src, null);
  assert.equal(page.film.src, null);
  page.ready();
  page.intersect(false);
  assert.equal(page.teaser.src, null);
  page.intersect(true);
  assert.equal(page.teaser.src, '/assets/video/carbonglobe-teaser.mp4');
  assert.equal(page.teaser.paused, false);
  assert.equal(page.motion.getAttribute('aria-label'), 'Pause video preview');
  assert.equal(page.film.src, null);
});

for (const preference of ['reducedMotion', 'saveData']) {
  test(`${preference} disables automatic video loading but permits explicit play`, () => {
    const page = setup({ [preference]: true });
    page.ready();
    page.intersect(true);
    assert.equal(page.teaser.src, null);
    assert.equal(page.teaser.playCalls, 0);
    page.motion.emit('click');
    assert.notEqual(page.teaser.src, null);
    assert.equal(page.teaser.paused, false);
  });
}

test('teaser pauses offscreen and in a hidden document, then resumes', () => {
  const page = setup();
  page.ready();
  page.intersect(true);
  page.intersect(false);
  assert.equal(page.teaser.paused, true);
  page.intersect(true);
  assert.equal(page.teaser.paused, false);
  page.document.hidden = true;
  page.document.emit('visibilitychange');
  assert.equal(page.teaser.paused, true);
  page.document.hidden = false;
  page.document.emit('visibilitychange');
  assert.equal(page.teaser.paused, false);
});

test('user pause remains in effect after leaving and reentering the viewport', () => {
  const page = setup();
  page.ready();
  page.intersect(true);
  page.motion.emit('click');
  assert.equal(page.teaser.paused, true);
  assert.equal(page.motion.getAttribute('aria-label'), 'Play video preview');
  const playCalls = page.teaser.playCalls;
  page.intersect(false);
  page.intersect(true);
  assert.equal(page.teaser.paused, true);
  assert.equal(page.teaser.playCalls, playCalls);
});

test('full film loads only on click and releases its source on close', () => {
  const page = setup();
  page.ready();
  page.intersect(true);
  assert.equal(page.film.src, null);
  assert.equal(page.film.playCalls, 0);
  assert.equal(page.watch.emit('click').defaultPrevented, true);
  assert.equal(page.dialog.open, true);
  assert.equal(page.film.src, page.watch.href);
  assert.equal(page.film.paused, false);
  assert.equal(page.teaser.paused, true);
  assert.equal(page.document.body.classes.has('carbon-film-open'), true);
  page.close.emit('click');
  assert.equal(page.dialog.open, false);
  assert.equal(page.film.src, null);
  assert.equal(page.film.paused, true);
  assert.equal(page.film.loadCalls, 1);
  assert.equal(page.document.body.classes.has('carbon-film-open'), false);
  assert.equal(page.watch.focused, true);
  assert.equal(page.teaser.paused, false);
});

test('default placement waits for publications, then appends exactly once under CarbonGlobe', () => {
  const page = setup();
  assert.equal(page.spotlight.hidden, true);
  assert.equal(page.spotlight.parentElement, page.originalParent);
  assert.equal(page.teaser.src, null);
  page.ready();
  assert.equal(page.spotlight.hidden, false);
  assert.equal(page.spotlight.parentElement, page.paper);
  assert.equal(page.spotlight.classes.has('spotlight-inline'), true);
  assert.deepEqual(page.paper.childNodes, [page.spotlight]);
  assert.deepEqual(page.originalParent.childNodes, []);
  page.ready();
  assert.deepEqual(page.paper.childNodes, [page.spotlight]);
  assert.equal(page.teaser.src, null);
});

test('already-loaded publication receives the inline spotlight immediately', () => {
  const page = setup({ paperInitiallyAvailable: true });
  assert.equal(page.spotlight.hidden, false);
  assert.equal(page.spotlight.parentElement, page.paper);
});

test('intro override is available only on local preview hosts', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const page = setup({ hostname, search: '?spotlight=intro' });
    assert.equal(page.spotlight.hidden, false);
    page.ready();
    assert.equal(page.spotlight.parentElement, page.originalParent);
    assert.equal(page.spotlight.classes.has('spotlight-inline'), false);
  }
  const productionPage = setup({ hostname: 'zhwang0.github.io', search: '?spotlight=intro' });
  assert.equal(productionPage.spotlight.hidden, true);
  productionPage.ready();
  assert.equal(productionPage.spotlight.parentElement, productionPage.paper);
});

test('publication loading failure unhides the original spotlight fallback', () => {
  const page = setup();
  assert.equal(page.spotlight.hidden, true);
  page.document.emit('homepage:publications-failed');
  assert.equal(page.spotlight.hidden, false);
  assert.equal(page.spotlight.parentElement, page.originalParent);
  assert.equal(page.spotlight.classes.has('spotlight-inline'), false);
});

test('teaser delivery errors preserve the static fallback and stop retries', () => {
  const page = setup();
  page.ready();
  page.intersect(true);
  page.teaser.emit('error');
  assert.equal(page.teaser.src, null);
  assert.equal(page.motion.hidden, true);
  const playCalls = page.teaser.playCalls;
  page.intersect(false);
  page.intersect(true);
  assert.equal(page.teaser.src, null);
  assert.equal(page.teaser.playCalls, playCalls);
});
