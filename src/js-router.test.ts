import { Router } from './js-router';

let initialWindowLocation,
    initialWindowBase,
    initialWindowPath,
    initialWindowSearch;

let controllerCalls,
    controllerSpy;

let analyticsCalls;

let container: Element;

window.analytics = {
  page: null
};

QUnit.module('Router tests', {
  beforeEach: () => {
    initialWindowLocation = window.location.href;
    initialWindowBase = window.location.origin;
    initialWindowPath = window.location.pathname;
    initialWindowSearch = window.location.search;

    controllerCalls = [];
    controllerSpy = (vars, queryString) => {
      controllerCalls.push({
        vars: vars,
        queryString: queryString
      });
    };

    analyticsCalls = [];
    window.analytics.page = (analyticsObject) => {
      analyticsCalls.push(analyticsObject);
    };

    container = document.createElement('div');
  },
  afterEach: () => {
    history.pushState({}, 'Reset location', initialWindowLocation);
  }
});

QUnit.test('Throws javascript error if route does not exist', assert => {
  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '/hungry/hippos'));
  const r = new Router({
    'mouse/trap': () => null
  }, container);

  assert.throws(() => {
    r.init();
  });
});

QUnit.test('If no base route is declared, root is assumed', assert => {
  container.innerHTML = 'Some text that needs to be replaced.';
  
  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '/hungry/hippos'));
  const r = new Router({
    'hungry/hippos': () => null
  }, container);

  r.init();

  assert.equal(r.getRoute(), 'hungry/hippos');
  assert.equal(container.innerHTML, '');
});

QUnit.test('Can read a base route from path', assert => {
  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '/nicolas/cage/is/awesome/no/matter/what/anyone/says'));
  const r = new Router({
    'is/awesome/no/matter/what/anyone/says': () => null
  }, container, ['nicolas/cage']);
  r.init();

  assert.equal(r.getRoute(), 'is/awesome/no/matter/what/anyone/says');

  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '/nicolasCage.aspx/was/in/The/rock'));
  const r2 = new Router({
    'was/in/the/rock': () => null
  }, container, ['nicolasCage.aspx']);
  r2.init();

  assert.equal(r2.getRoute(), 'was/in/the/rock');

  history.pushState({}, 'Reset route to website base. Would be used if homepage were a SPA.', encodeURI(initialWindowBase + '/'));
  const r3 = new Router({
    '': () => null
  }, container, ['/']);
  r3.init();

  assert.equal(r3.getRoute(), '');
});

QUnit.test('Can ignore link if the base route given does not match the current one', assert => {
  const nodeStub = document.createElement('div');
  nodeStub.innerHTML = `<a href="https://NicolasCageIsADork/"></a>`;

  nodeStub.addEventListener('click', e => {
    assert.equal(e.defaultPrevented, false);
    e.preventDefault();
  });

  const r = new Router({'': () => null}, container, ['nicolas/cage']);
  r.setupView(nodeStub);
  nodeStub.querySelector('a').dispatchEvent(TestUtilities.Click)
});

QUnit.test('Can read multiple base routes', assert => {
  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '/nicolas/cage/is/awesome/no/matter/what/anyone/says'));
  const r = new Router({
    'is/awesome/no/matter/what/anyone/says': () => null,
    'still/funny': () => null
  }, container, ['nicolas/cage', 'ben/stiller/is']);
  r.init();

  assert.equal(r.getRoute(), 'is/awesome/no/matter/what/anyone/says');
  
  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '/ben/stiller/is/still/funny'));
  r.init();

  assert.equal(r.getRoute(), 'still/funny');
});

QUnit.test('Can call a specific function based on a dictionary lookup', assert => {
  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '/account'));
  const r = new Router({
    'account': controllerSpy
  }, container, ['/']);

  r.init();

  assert.equal(controllerCalls.length, 1);
});

QUnit.test('Can handle a route with a querystring and preserve the query string', assert => {
  history.pushState({}, 'Reset route with query string', encodeURI(initialWindowBase + '/account/orders?id=130342'));
  const r = new Router({
    'account/orders': controllerSpy
  }, container, ['/']);

  r.init();

  assert.equal(controllerCalls[0].queryString, '?id=130342');
});

QUnit.test('Can parse out variables from path', assert => {
  history.pushState({}, 'Path with variables', encodeURI(initialWindowBase + '/account/23905/order/GTM679'));
  const r = new Router({
    '{accountNumber}/order/{orderNumber}': controllerSpy
    }, container, ['account']);

  r.init();

  assert.equal(controllerCalls[0]['vars']['accountNumber'], '23905');
  assert.equal(controllerCalls[0]['vars']['orderNumber'], 'gtm679');
});

QUnit.test('Pushes info to anayltics tracker on every update', assert => {
  history.pushState({}, 'Path with variables', encodeURI(initialWindowBase + '/account/23905/order/GTM679'));
  const r = new Router({
    '{accountNumber}/order/{orderNumber}': controllerSpy
    }, container, ['account']);

  r.init();

  assert.equal(analyticsCalls[0].name, '{accountNumber}/order/{orderNumber}');
  assert.equal(analyticsCalls[0].properties.url, '/account/23905/order/gtm679');
});

QUnit.test('Can setup data-route links in a view', assert => {
  const viewStub = createViewStub();

  history.pushState({}, 'Path with variables', encodeURI(initialWindowBase + '/account'));
  const r = new Router({
    '': controllerSpy,
    '{accountNumber}': controllerSpy,
    '{accountNumber}/order/{orderNumber}': controllerSpy
    }, container, ['account.aspx', 'account']);

  r.init();
  r.setupView(viewStub);

  viewStub.querySelectorAll('a')[1].dispatchEvent(TestUtilities.Click);

  assert.equal(controllerCalls[1]['vars']['accountNumber'], '24543');
  assert.equal(r.getBaseRoute(), 'account');
});

QUnit.test('Will ignore route update with hash', assert => {
  history.pushState({}, 'Reset route', encodeURI(initialWindowBase + '#hash'));

  const r = new Router({
          '': () => null,
          'hash': () => null
        }, container, ['/']);

  r.init();

  assert.equal(r.getRoute(), '');
});

function createViewStub(): Element {
  const nodeStub = document.createElement('div');

  nodeStub.innerHTML = `
    <a href="24543">Link to Account</a>
    <a href="24543/order/3298">Link to Order</a>
  `;

  return nodeStub;
}

class TestUtilities {
  public static Click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
}
