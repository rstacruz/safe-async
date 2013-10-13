var errify;

/**
 * Promise/async shim.
 */

var defer = module.exports = function(fn) {
  // Return a function that decorates the original `fn`.
  return function() {
    var self = this;
    var last = arguments[arguments.length-1];

    // Create the new callback.
    // This is an overloaded function:
    //
    //   - When called with an `Error` instance, it reports it to the "err" handler.
    //
    //   - When called with a function, it wraps that in a try/catch block,
    //     and reports any errors back to the err handler.
    //
    //   - Everything else is reported to the "ok" handler.
    //
    var next = function(result) {
      var _self = this;
      if (result instanceof Function)
        return next.wrap.call(_self, result);
      else if (result instanceof Error)
        next.err.call(_self, result);
      else
        next.ok.apply(_self, arguments);
    };

    // Wrap
    next.wrap = function(fn) {
      return function() {
        try {
          fn.apply(this, arguments);
        } catch (err) {
          next.err.call(this, err);
        }
      };
    };

    // This function will invoke the given `fn`, swapping out the last arg for
    // a new callback. If `fn` returns a promise, treat it accordingly. If `fn`
    // throws an error, report it to the err handler.
    //
    var args = [].slice.call(arguments, 0, arguments.length-1);
    var invoke = function() {
      try {
        var result = fn.apply(self, args.concat([next]));
        if (result && result.then)
          result.then(next.ok, function(err) { return next.err.call(this, err); });
        return result;
      } catch (err) {
        next.err.call(this, err);
      }
    };

    // Used as an async:
    // The function was invoked with a callback at the `last` argument.
    //
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
    //
    else {
      var p = {};
      var promise = defer.promise(function(_ok, _err) { p.ok = _ok; p.err = _err; });

      next.ok = function() { p.ok.apply(promise, arguments); };
      next.err = function(err) { p.err.call(promise, errify(err)); };

      immediate(invoke);
      return promise;
    }
  };
};

/**
 * This is the promise creator.
 */

defer.promise = require('q').promise;

function immediate(fn) {
  if (typeof setImmediate === 'function') setImmediate(fn);
  else if (typeof process === 'object') process.nextTick(fn);
  else setTimeout(fn, 0);
}

/**
 * Converts a function into error.
 */

errify = defer.errify = function(e) {
  return (e instanceof Error) ? e : new Error(e);
};
