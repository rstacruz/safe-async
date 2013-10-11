var defer = module.exports = function(fn) {
  // Return a function that decorates the original
  return function() {
    var self = this;
    var last = arguments[arguments.length-1];

    // These are handlers that will be populated, depending on whether it was
    // invoked async-style or promise-style.
    var ok, fail;

    // Create the new callback.
    // This is an overloaded function:
    //
    //   - When called with an `Error` instance, it reports it to the "fail" handler.
    //
    //   - When called with a function, it wraps that in a try/catch block,
    //     and reports any errors back to the fail handler.
    //
    //   - Everything else is reported to the "ok" handler.
    //
    var next = function(result) {
      var _self = this;
      if (result instanceof Function) {
        return function() {
          try {
            result.apply(_self, arguments);
          } catch (err) {
            fail(errify(err));
          }
        };
      } else if (result instanceof Error) {
        fail.call(_self, errify(result));
      } else {
        ok.apply(_self, arguments);
      }
    };

    // This function will invoke the given `fn`, swapping out the last arg for
    // a new callback. If `fn` returns a promise, treat it accordingly. If `fn`
    // throws an error, report it to the fail handler.
    //
    var args = [].slice.call(arguments, 0, arguments.length-1);
    var invoke = function() {
      try {
        var result = fn.apply(self, args.concat([next]));
        if (result && result.then)
          result.then(ok, function(err) { return fail(errify(err)); });
        return result;
      } catch (err) {
        fail(err);
      }
    };

    // Used as an async:
    // The function was invoked with a callback at the `last` argument.
    //
    if (typeof last === 'function') {
      var callback = last;
      fail = function(err) {
        callback.call(self, err); };
      ok = function(result) {
        callback.apply(self, [undefined].concat([].slice.call(arguments))); };
      return invoke();
    }

    // Used as a promise:
    // The function was invoked without a callback; ensure that it returns a promise.
    //
    else {
      var p = {};
      var promise = defer.promise(function(_ok, _fail) { p.ok = _ok; p.fail = _fail; });

      ok = function() { p.ok.apply(promise, arguments); };
      fail = function(err) { p.fail.call(promise, err); };

      immediate(invoke);
      return promise;
    }
  };
};

defer.promise = require('q').promise;

function immediate(fn) {
  if (typeof setImmediate === 'function') setImmediate(fn);
  else if (typeof process === 'object') process.okTick(fn);
  else setTimeout(fn, 0);
}

function errify(e) {
  return (e instanceof Error) ? e : new Error(e);
}
