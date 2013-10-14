(function(factory) {
  if (typeof module !== 'undefined') module.exports = factory();
  else this.safe = factory();
})(function() {

  var immediate;

  /**
   * Promise/async shim.
   */

  var safe = function(fn) {
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
        next.err = function(err) {
          last.call(self, err); };
        next.ok = function(result) {
          last.apply(self, [undefined].concat([].slice.call(arguments))); };
        next.progress = function() {};
        return invoke();
      }

      // Used as a promise:
      // The function was invoked without a callback; ensure that it returns a promise.
      else {
        if (!safe.promise)
          throw new Error("No promises support (safe.promise not defined)");

        var promise = new safe.promise(function(ok, err, progress) {
          next.ok = ok;
          next.err = err;
          next.progress = progress;
        });
        immediate(invoke);
        return promise;
      }
    };
  };

  /**
   * Creates a `next` callback function and returns it.
   */

  function _next() {
    return function next(result) {
      next.ok.apply(this, arguments);
    };
  }

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
          result.then(
            next.ok,
            function(err) { return next.err.call(this, err); },
            next.progress);
        return result;
      } catch (err) {
        next.err.call(this, err);
      }
    };
  }

  /**
   * The promise provider function that allows you to plug in the promise
   * library of your choice.
   * 
   * `safe.promise` is expected to be a function used to create promises in
   * this manner below. Most promise libraries implement a function similar to
   * this.
   * 
   *     var promise = safe.promise(function(ok, err, progress) {
   *       ok("This returns a result");
   *       err("This returns an error");
   *       progress("This sends progress updates");
   *     });
   */

  safe.promise = null;

  /**
   * Helper: shim for setImmediate().
   */

  immediate = 
    (typeof setImmediate === 'function') ? setImmediate :
    (typeof process === 'object') ? process.nextTick :
    function(fn) { return setTimeout(fn, 0); };

  return safe;

});
