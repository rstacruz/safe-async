var defer = module.exports = function(fn) {
  // Return a function that decorates the original
  return function() {
    var next;
    var self = this;
    var last = arguments[arguments.length-1];
    var args = [].slice.call(arguments, 0, arguments.length-1);

    // Swap out the last arg for a new callback
    var invoke = function() {
      try {
        var result = fn.apply(self, args.concat([next]));
        if (result && result.then) {
          result.then(next, function(err) { next(errify(err)); });
        }
      } catch (err) {
        next(err);
      }
    };

    // Used as an async
    if (typeof last === 'function') {
      var callback = last;
      next = function(result) {
        if (result instanceof Error) {
          callback.call(self, result);
        } else {
          var args = [].slice.call(arguments);
          callback.apply(self, [undefined].concat(args));
        }
      };

      invoke();
      return;
    }

    // Used as a promise
    else {
      var ok, fail;
      var promise = defer.promise(function(_ok, _fail) {
        ok = _ok; fail = _fail;
      });

      next = function(result) {
        if (result instanceof Error)
          fail.call(promise, result);
        else
          ok.apply(promise, arguments);
      };

      immediate(invoke);
      return promise;
    }
  };
};

defer.promise = require('q').promise;

function immediate(fn) {
  if (typeof setImmediate === 'function') setImmediate(fn);
  else if (typeof process === 'object') process.nextTick(fn);
  else setTimeout(fn, 0);
}

function errify(e) {
  return (e instanceof Error) ? e : new Error(e);
}
