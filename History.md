## v0.3.1 - Oct 22, 2013

Adds `next.cwrap()`, a catch-only version of `next.wrap()` that doesn't care 
about arguments.

It works exactly like `next.wrap()`, with the exception that it doesn't expect 
the first argument of the function to be an error. In this example below, the 
wrapped function expects a `chunk` argument, which is not an error.

~~~ js
readInput = safe(function (next) {
  var data = '';

  process.stdin.on('data', next.cwrap(function (chunk) {
    // If isClean throws an error, it'll be propagated into readInput's
    // error callback.
    if (!isClean(chunk)) return;
    data += chunk;
  });

  process.stdin.on('end', next.cwrap(function () {
    next.ok(data);
  });
});
~~~

## v0.3.0 - Oct 21, 2013

WARNING: possibly not backwards-compatible.

`next.wrap()` now catches errors passed onto it by arguments. This means you can 
do:

~~~ js
// New way
var fname = 'abc.html';
fs.readFile(fname, next.wrap(function(err, data) {
  next(null, { file: fname, contents: data });
});
~~~

instead of this:

~~~ js
// Old way (0.2.0 and below)
var fname = 'abc.html';
fs.readFile(fname, next.wrap(function(err, data) {
  if (err) throw err;
  next(null, { file: fname, contents: data });
});
~~~

## v0.2.0 - Oct 19, 2013

WARNING: not a backward-compatible release. This release changes the `next()`
API to be like the callback that's being given.

This changes the way to return a success:

~~~ js
var result = whatever();

next(result);       /* <-- old way (don't) */

next(null, result); /* <-- new way (ok) */
next.ok(result);    /* <-- also works */
~~~

This also allows you to return errors:

~~~ js
var error = new Error("Uh oh");

throw error;        /* <-- still works */
next.err(error);    /* <-- still works */
next(error);        /* <-- new way */
~~~

## v0.1.1 - Oct 14, 2013

 * Simplify the promise-to-promise relaying code.
 * Documentation updates.

## v0.1.0 - Oct 14, 2013

 * Initial release.
