import sinon from 'sinon';
import { applyMiddleware, createStore } from 'redux';
import { createLogger } from '../src';

context('output behaviour', () => {
  /**
   * Log order tests: Verifies that the order of logged actions matches
   *    the order of dispatched actions.
   */
  describe('log order', () => {
    /**
     * For order tests, we only care about the order of the logged
     *    actions. Configure the logger to reduce other noise.
     */
    const testLogger = createLogger({
      // Only log actions and errors.
      level: {
        prevState: false,
        action: 'info',
        error: 'info',
        nextState: false,
      },
    });

    /**
     * Scenario: Two actions are dispatched (from the same context),
     *    one after the other.
     * Expected: Actions are logged in the order they were dispatched.
     */
    it('actions dispatched first in sequence should be logged first', () => {
      const store = createStore(() => ({}), applyMiddleware(testLogger));

      // The testLogger logs actions at 'info' level, so spy those.
      sinon.spy(console, 'info');

      store.dispatch({ type: 'foo' });
      store.dispatch({ type: 'bar' });

      const typeOne = console.info.getCall(0).args[2].type;
      const typeTwo = console.info.getCall(1).args[2].type;

      sinon.assert.match(typeOne, 'foo');
      sinon.assert.match(typeTwo, 'bar');

      console.info.restore();
    });

    /**
     * Scenario: An action is dispatched, which causes another action
     *    to be dispatched from a middleware.
     * Expected: The action that triggered the second dispatch should
     *    be logged first.
     */
    it('actions triggering other actions should be logged first', () => {
      function testMiddleware({ dispatch }) {
        return next => (action) => {
          if (action.type === 'foo') {
            dispatch({ type: 'bar' });
          }
          return next(action);
        }
      }

      const store = createStore(() => ({}), applyMiddleware(testMiddleware, testLogger));

      sinon.spy(console, 'info');

      store.dispatch({ type: 'foo' });

      const typeOne = console.info.getCall(0).args[2].type;
      const typeTwo = console.info.getCall(1).args[2].type;

      // This should be at the end of the test case, but it won't run
      //    if it's after a failing `.match`. Put it earlier so the
      //    next test case doesn't break.
      console.info.restore();

      sinon.assert.match(typeOne, 'foo');
      sinon.assert.match(typeTwo, 'bar');
    });

    /**
     * Scenario: Two actions are dispatched from the same context.
     *    The first action causes another action to be dispatched
     *    from a middleware.
     * Expected: Any actions dispatched from middlewares should be
     *    logged before any subsequent actions dispatched from the
     *    initial context.
     */
    it('triggered actions should be logged immediately after the action that triggered them', () => {
      // On 'foo', dispatch 'bar'.
      function barMiddleware({ dispatch }) {
        return next => (action) => {
          if (action.type === 'foo') {
            dispatch({ type: 'bar' });
          }
          return next(action);
        }
      }

      const store = createStore(() => ({}), applyMiddleware(barMiddleware, testLogger));

      sinon.spy(console, 'info');

      store.dispatch({ type: 'foo' });
      store.dispatch({ type: 'baz' });

      const typeOne = console.info.getCall(1).args[2].type;
      const typeTwo = console.info.getCall(2).args[2].type;

      console.info.restore();

      sinon.assert.match(typeOne, 'bar');
      sinon.assert.match(typeTwo, 'baz');
    });

    /**
     * Scenario: An action dispatched from a middleware causes
     *    another action to be dispatched from a middleware.
     * Expected: The earlier middleware action is logged first.
     */
    it('earlier actions dispatched from middlewares should be logged first', () => {
      // On 'foo', dispatch 'bar'.
      function barMiddleware({ dispatch }) {
        return next => (action) => {
          if (action.type === 'foo') {
            dispatch({ type: 'bar' });
          }
          return next(action);
        }
      }
      // On 'bar', dispatch 'baz'.
      function bazMiddleware({ dispatch }) {
        return next => (action) => {
          if (action.type === 'bar') {
            dispatch({ type: 'baz' });
          }
          return next(action);
        }
      }

      const store = createStore(
        () => ({}),
        applyMiddleware(barMiddleware, bazMiddleware, testLogger),
      );

      sinon.spy(console, 'info');

      store.dispatch({ type: 'foo' });

      const typeOne = console.info.getCall(1).args[2].type;
      const typeTwo = console.info.getCall(2).args[2].type;

      console.info.restore();

      sinon.assert.match(typeOne, 'bar');
      sinon.assert.match(typeTwo, 'baz');
    });
  });
});
