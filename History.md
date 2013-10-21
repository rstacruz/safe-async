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
