(function(factory) {
  if (typeof module !== 'undefined') module.exports = factory();
  else this.defer = factory();
})(function() {

  var errify;

  /**
   * Promise/async shim.
   */

  var defer = function(fn) {
    // Return a function that decorates the original `fn`.
    return function() {
      var self = this;
      var last = arguments[arguments.length-1];
      var args = [].slice.call(arguments, 0, arguments.length-1);

      // Create the `next` handler.
      var next = _next();
      next.wrap = _wrap(next);

      // Create the invoker function that, when called, will run `fn()` as needed.
      var invoke = _invoke(fn, args, next, self);

      // Used as an async:
      // The function was invoked with a callback at the `last` argument.
      if (typeof last === 'function') {
        var callback = last;
        next.err = function(err) {
          callback.call(self, errify(err)); };
        next.ok = function(result) {
          callback.apply(self, [undefined].concat([].slice.call(arguments))); };
        return invoke();
      }

      // Used as a promise:
      // The function was invoked without a callback; ensure that it returns a promise.
      else {
        if (!defer.promise) throw new Error("No promises support (defer.promise not defined)");
        var p = {};
        var promise = new defer.promise(function(_ok, _err) { p.ok = _ok; p.err = _err; });
        next.ok = function() { p.ok.apply(promise, arguments); };
        next.err = function(err) { p.err.call(promise, errify(err)); };
        immediate(invoke);
        return promise;
      }
    };
  };

  /**
   * Creates a `wrap` decorator function.
   *
   * This creates a function `wrap` that taken an argument `fn`, executes it, and
   * passes the errors to `next.err`.
   */
  function _wrap(next) {
    return function(fn) {
      return function() {
        try { fn.apply(this, arguments); }
        catch (e) { next.err.call(this, e); }
      };
    };
  }

  /**
   * Creates a `next` callback and returns it.
   *
   * This callback will delegate to `next.wrap()`, `next.ok()`, and `next.err()`
   * depending on the arguments it was called with.
   *
   *   - When called with an `Error` instance, it reports it to `next.err(...)`.
   *
   *   - When called with a function, it runs it through `next.wrap(...)`.
   *
   *   - Everything else is ran through `next.ok(...)`.
   */
  function _next() {
    return function next(result) {
      var _self = this;
      if (result instanceof Function)
        return next.wrap.call(_self, result);
      else if (result instanceof Error)
        next.err.call(_self, result);
      else
        next.ok.apply(_self, arguments);
    };
  }

  /**
   * Creates an invoker function. This function will run `fn` (with arguments
   * `args` and `next`, in context `self`), then report any errors caught to
   * `next.err`.
   *
   * If the function `fn` returns a promise, it'll be passed to `next` as needed.
   *
   * This function will invoke the given `fn`, swapping out the last arg for
   * a the callback `next`.
   */
  function _invoke(fn, args, next, self) {
    return function invoke() {
      try {
        var result = fn.apply(self, args.concat([next]));
        if (result && result.then)
          result.then(next.ok, function(err) { return next.err.call(this, err); });
        return result;
      } catch (err) {
        next.err.call(this, err);
      }
    };
  }

  /**
   * This is the promise provider.
   */

  defer.promise = null;

  /**
   * Converts a function into error.
   */

  errify = defer.errify = function(e) {
    return (e instanceof Error) ? e : new Error(e);
  };

  /**
   * Helper: shim for setImmediate().
   */

  function immediate(fn) {
    if (typeof setImmediate === 'function') setImmediate(fn);
    else if (typeof process === 'object') process.nextTick(fn);
    else setTimeout(fn, 0);
  }

  return defer;

});
