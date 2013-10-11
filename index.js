var defer = module.exports = function(fn) {
  // Return a function that decorates the original
  return function() {
    var ok, fail;
    var self = this;
    var last = arguments[arguments.length-1];
    var args = [].slice.call(arguments, 0, arguments.length-1);

    // Create the new callback.
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

    // Swap out the last arg for a new callback
    var invoke = function() {
      try {
        var result = fn.apply(self, args.concat([next]));
        if (result && result.then)
          result.then(ok, function(err) { return fail(errify(err)); });
      } catch (err) {
        fail(err);
      }
    };

    // Used as an async:
    // The function was invoked with a callback at the `last` argument.
    if (typeof last === 'function') {
      var callback = last;
      fail = function(err) {
        callback.call(self, err);
      };
      ok = function(result) {
        callback.apply(self, [undefined].concat([].slice.call(arguments)));
      };
      invoke();
      return;
    }

    // Used as a promise
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
