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
  const projects = (options.projects || ['carbon']).map((name) => {
    const isCarbon = name === 'carbon';
    const spotlight = new Element();
    spotlight.id = `${name}-spotlight`;
    spotlight.setAttribute('data-paper-id', isCarbon ? 'carbon-globe' : 'sigspatial26-earth-system-world-model');
    spotlight.setAttribute('data-film-dialog', `${name}-film-dialog`);
    const originalParent = new Element();
    originalParent.appendChild(spotlight);
    const paper = new Element();
    const teaser = new Media();
    teaser.setAttribute('data-src', `/assets/video/${isCarbon ? 'carbonglobe' : 'eswm'}-teaser.mp4`);
    const motion = new Element();
    motion.hidden = true;
    motion.children.i = new Element();
    const watch = new Element();
    watch.href = isCarbon
      ? 'https://zhwang0.github.io/carbon-globe-website/assets/film/carbonglobe-film.mp4'
      : 'https://zhwang0.github.io/earth-system-world-model/assets/film/eswm-film.mp4';
    spotlight.children = {
      '.spotlight-teaser': teaser, '.spotlight-motion': motion, '.spotlight-watch': watch,
    };
    const dialog = new Element();
    const film = new Media();
    const close = new Element();
    dialog.children = { '.carbon-full-film': film, '.carbon-film-close': close };
    dialog.open = false;
    if (!options.noNativeDialog) dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; dialog.emit('close'); };
    dialog.getBoundingClientRect = () => ({ left: 20, top: 20, right: 300, bottom: 200 });
    if (options.incompleteProject === name) delete motion.children.i;
    return {
      name, spotlight, originalParent, paper, teaser, motion, watch, dialog, film, close,
      paperAvailable: Boolean(options.paperInitiallyAvailable),
    };
  });
  const document = new Element();
  document.body = new Element();
  document.hidden = false;
  document.getElementById = (id) => {
    for (const project of projects) {
      if (id === project.spotlight.id) return project.spotlight;
      if (id === project.spotlight.getAttribute('data-paper-id') && project.paperAvailable) return project.paper;
      if (id === project.spotlight.getAttribute('data-film-dialog') && options.missingDialog !== project.name) return project.dialog;
    }
    return null;
  };
  document.querySelectorAll = (selector) => {
    assert.equal(selector, '.research-spotlight[data-paper-id][data-film-dialog]');
    return projects.map((project) => project.spotlight);
  };
  const reducedMotion = new Element();
  reducedMotion.matches = Boolean(options.reducedMotion);
  const connection = new Element();
  connection.saveData = Boolean(options.saveData);
  const intersectionCallbacks = new Map();
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe(element) { intersectionCallbacks.set(element, this.callback); }
  }
  const window = {
    location: { hostname: options.hostname || 'localhost', search: options.search || '', hash: '' },
    matchMedia: () => reducedMotion,
    requestAnimationFrame: (callback) => callback(),
    IntersectionObserver,
  };
  if (options.noIntersectionObserver) delete window.IntersectionObserver;
  vm.runInNewContext(source, {
    window, document, navigator: { connection }, IntersectionObserver, URLSearchParams,
  }, { filename: 'research-spotlight.js' });
  for (const project of projects) {
    project.intersect = (visible) => intersectionCallbacks.get(project.teaser)([{ isIntersecting: visible }]);
  }
  return {
    ...projects[0], projects, document, reducedMotion, connection,
    ready: () => {
      projects.forEach((project) => { project.paperAvailable = true; });
      document.emit('homepage:publications-ready');
    },
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

test('multiple spotlights attach once to their respective publications', () => {
  const page = setup({ projects: ['carbon', 'eswm'] });
  page.ready();
  page.ready();
  for (const project of page.projects) {
    assert.equal(project.spotlight.parentElement, project.paper);
    assert.deepEqual(project.paper.childNodes, [project.spotlight]);
    assert.equal(project.paper.classes.has('spotlight-paper'), true);
    assert.equal(project.spotlight.hidden, false);
    assert.equal(project.teaser.src, null);
  }
});

test('each teaser loads and plays independently only when visible', () => {
  const page = setup({ projects: ['carbon', 'eswm'] });
  const [carbon, eswm] = page.projects;
  page.ready();
  eswm.intersect(true);
  assert.equal(eswm.teaser.src, '/assets/video/eswm-teaser.mp4');
  assert.equal(eswm.teaser.paused, false);
  assert.equal(carbon.teaser.src, null);
  eswm.intersect(false);
  carbon.intersect(true);
  assert.equal(eswm.teaser.paused, true);
  assert.equal(carbon.teaser.paused, false);
});

test('opening either film pauses all teasers and loads only its own film', () => {
  for (const selectedIndex of [0, 1]) {
    const page = setup({ projects: ['carbon', 'eswm'] });
    page.ready();
    page.projects.forEach((project) => project.intersect(true));
    const selected = page.projects[selectedIndex];
    const other = page.projects[1 - selectedIndex];
    selected.watch.emit('click');
    assert.equal(selected.film.src, selected.watch.href);
    assert.equal(selected.dialog.open, true);
    assert.equal(other.film.src, null);
    assert.equal(other.dialog.open, false);
    page.projects.forEach((project) => assert.equal(project.teaser.paused, true));
    // Other playback triggers cannot restart previews while a film is open.
    other.intersect(true);
    assert.equal(other.teaser.paused, true);
    selected.close.emit('click');
    assert.equal(selected.film.src, null);
    assert.equal(selected.watch.focused, true);
    page.projects.forEach((project) => assert.equal(project.teaser.paused, false));
  }
});

test('closing a film preserves each teaser manual pause and visibility state', () => {
  const page = setup({ projects: ['carbon', 'eswm'] });
  const [carbon, eswm] = page.projects;
  page.ready();
  carbon.intersect(true);
  eswm.intersect(true);
  carbon.motion.emit('click');
  eswm.watch.emit('click');
  eswm.intersect(false);
  eswm.close.emit('click');
  assert.equal(carbon.teaser.paused, true);
  assert.equal(eswm.teaser.paused, true);
  eswm.intersect(true);
  assert.equal(eswm.teaser.paused, false);
  assert.equal(carbon.teaser.paused, true);
});

test('scroll lock and teaser pause remain until all open films are closed', () => {
  const page = setup({ projects: ['carbon', 'eswm'] });
  const [carbon, eswm] = page.projects;
  page.ready();
  carbon.intersect(true);
  eswm.intersect(true);
  carbon.watch.emit('click');
  eswm.watch.emit('click');
  carbon.close.emit('click');
  assert.equal(page.document.body.classes.has('carbon-film-open'), true);
  assert.equal(carbon.watch.focused, undefined);
  assert.equal(carbon.teaser.paused, true);
  assert.equal(eswm.teaser.paused, true);
  eswm.close.emit('click');
  assert.equal(page.document.body.classes.has('carbon-film-open'), false);
  assert.equal(eswm.watch.focused, true);
});

test('local intro placement remains CarbonGlobe-only', () => {
  const page = setup({ projects: ['carbon', 'eswm'], search: '?spotlight=intro' });
  const [carbon, eswm] = page.projects;
  page.ready();
  assert.equal(carbon.spotlight.parentElement, carbon.originalParent);
  assert.equal(eswm.spotlight.parentElement, eswm.paper);
});

test('modified and non-primary clicks keep the direct full-film link behavior', () => {
  const page = setup({ projects: ['carbon', 'eswm'] });
  page.ready();
  for (const project of page.projects) {
    for (const properties of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      assert.equal(project.watch.emit('click', properties).defaultPrevented, false);
      assert.equal(project.dialog.open, false);
      assert.equal(project.film.src, null);
    }
  }
});

test('without native dialogs full-film links remain usable and teasers still work', () => {
  const page = setup({ projects: ['carbon', 'eswm'], noNativeDialog: true });
  page.ready();
  for (const project of page.projects) {
    project.intersect(true);
    assert.equal(project.teaser.paused, false);
    assert.equal(project.watch.emit('click').defaultPrevented, false);
    assert.equal(project.film.src, null);
  }
});

test('a missing dialog degrades to its direct link without breaking either teaser', () => {
  const page = setup({ projects: ['carbon', 'eswm'], missingDialog: 'eswm' });
  page.ready();
  const [carbon, eswm] = page.projects;
  eswm.intersect(true);
  assert.equal(eswm.watch.emit('click').defaultPrevented, false);
  assert.equal(eswm.teaser.paused, false);
  carbon.intersect(true);
  carbon.watch.emit('click');
  assert.equal(carbon.dialog.open, true);
  assert.equal(eswm.teaser.paused, true);
});

test('incomplete spotlight markup does not prevent another project from working', () => {
  const page = setup({ projects: ['carbon', 'eswm'], incompleteProject: 'carbon' });
  const [carbon, eswm] = page.projects;
  page.ready();
  assert.equal(carbon.motion.hidden, true);
  assert.equal(carbon.teaser.src, null);
  eswm.intersect(true);
  assert.equal(eswm.teaser.paused, false);
  eswm.watch.emit('click');
  assert.equal(eswm.dialog.open, true);
});

test('video errors in one project do not stop the other project', () => {
  const page = setup({ projects: ['carbon', 'eswm'] });
  const [carbon, eswm] = page.projects;
  page.ready();
  carbon.intersect(true);
  eswm.intersect(true);
  carbon.teaser.emit('error');
  assert.equal(carbon.motion.hidden, true);
  assert.equal(carbon.teaser.src, null);
  assert.equal(eswm.teaser.paused, false);
  eswm.watch.emit('click');
  eswm.close.emit('click');
  assert.equal(carbon.teaser.src, null);
  assert.equal(eswm.teaser.paused, false);
});

test('without IntersectionObserver each preview remains opt-in', () => {
  const page = setup({ projects: ['carbon', 'eswm'], noIntersectionObserver: true });
  page.ready();
  const [carbon, eswm] = page.projects;
  assert.equal(carbon.teaser.src, null);
  assert.equal(eswm.teaser.src, null);
  eswm.motion.emit('click');
  assert.equal(eswm.teaser.paused, false);
  assert.equal(carbon.teaser.src, null);
});

test('changing system motion or data preferences updates all untouched previews', () => {
  const page = setup({ projects: ['carbon', 'eswm'] });
  page.ready();
  page.projects.forEach((project) => project.intersect(true));
  page.reducedMotion.matches = true;
  page.reducedMotion.emit('change');
  page.projects.forEach((project) => assert.equal(project.teaser.paused, true));
  page.reducedMotion.matches = false;
  page.reducedMotion.emit('change');
  page.projects.forEach((project) => assert.equal(project.teaser.paused, false));
  page.connection.saveData = true;
  page.connection.emit('change');
  page.projects.forEach((project) => assert.equal(project.teaser.paused, true));
});
