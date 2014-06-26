safe-async.js
=============

**Provides a standard interface for async APIs with useful features.**

It catches errors for you. It makes your async functions work with promises or 
callbacks. In essence: it helps you write useful async API.

When to use it
--------------

**Protip:** Any time you're writing a function that takes a callback, use
safe-async.js. Yes. All of them. Why?

 * __Ensures proper error propagation.__  
 No need for lots of try/catch blocks: those will be taken care of for you.

 * __Support promises or callbacks.__  
 It makes your functions work with both async callbacks or promises with no 
 extra code.

 * __Portable.__   
 Works for Node.js and the browser. It's also pretty damn small (~70loc).

When not to use it: when your library does its async duties with 100% promises
and doesn't work with anything that expects callbacks. [q.js] already features
great error handling (`q.try`). But then again, when is this ever the case?

Get started in 20 seconds
-------------------------

Install:

~~~
$ npm install safe-async
~~~

Then use it. Bonus: you can optionally hook in a promise provider if you want to
take advantage of the promise features. (See [safe.promise](#safepromise))

~~~ js
var safe = require('safe-async');
safe.promise = require('q').promise;
~~~

Instead of writing an async function like so:

~~~ js
// Old-fashioned callback way
x = function(a, b, c, next) {
  if (success)
    next(null, "Result here");
  else
    next("uh oh, error");
};
~~~

Wrap that function in `safe` instead. (See [safe()](#safefn))

~~~ js
// New safe-async way
x = safe(function(a, b, c, next) {
  if (success)
    next.ok("Result here");
  else
    throw "uh oh, error";
});
~~~

When invoking another async function, wrap the callback in `next.wrap` too. This will catch
errors inside that function, and catch instances when that function is invoked 
to call an error. (See [next.wrap()](#next-wrap))

~~~ js
x = safe(function(a, b, c, next) {
  fs.readFile('x', next.wrap(function() { /* <-- here */
    if (success)
      next.ok("Result here");
    else
      throw "uh oh, error";
  });
});
~~~

Bonus: now your function can be used as a promise or a regular callback-powered async:

~~~ js
// Callback style
// (called with a function as the last param)
x(a, b, c, function(err, result) {
  if (err)
    console.log("Fail:", err);
  else
    console.log("OK:", result);
});
~~~

~~~ js
// Promise/A+ style
// (called without a function in the last param)
x(a, b, c)
  .then(function(result) {
    console.log("OK:", result);
  }, function(err) {
    console.log("Fail:", err);
  });
~~~

What it's not
-------------

 * It's not [async.js], because that lets you work many async callback-functions 
 in parallel (among other things).

 * It's not [q.js] or [when.js] or [rsvp.js] or [promise.js],
which helps you write promise functions and work with many promise objects.
However, you can hook up safe-async to use any of those to generate
promises.

What it solves
--------------

What follows is a long-winding explanation of safe-async's reason for living. If
you're already convinced of its need for existence, skip on over to [API](#api).

### Error catching

Perhaps the most inelegant thing about asynchronous JavaScript callbacks is 
error handling. Or rather: *proper* error handling.

To illustrate how this can get particularly hairy, let's start with an innocent 
function that expects a Node-style callback:

~~~ js
/**
 * Fetch the feed user (via AJAX) for a given `user`.
 */
getFeed = function(user, done) {
  var id = user.name.toLowerCase();

  $.get('/user/'+id+'/feeds.json', function(data) {
    if (data.entries)
      done(null, data);
    else
      done("No such user");
  });
};
~~~

This function expects an argument (`done`) callback that can be passed errors or 
data. Great! It can return errors! This is the style that most of the Node.js 
API is written in (along with thousands of Node packages), so it's got to be a 
good idea. Let's try to put it to test:

~~~ js
var john = {
  email: "john@gmail.com",
  name: "John"
};

getFeed(john, function(err, data) {
  if (err) console.log("Error:", err);
  console.log("John's entries:", data);
});
~~~

We just wrote a function that captures an errors (`if (err) ...`), or consumes 
the data otherwise. That's got to work right! Until it does something 
unfortunately unexpected:

~~~ js
var john = {
  email: "john@gmail.com",
  name: null  /* <-- uh oh. why doesn't he have a name? */
}; 

getFeed(john, function(err, data) {
  if (err) console.log("Error:", err);
  console.log("John's entries:", data);
});
~~~

~~~ js
TypeError: Cannot call method 'toLowerCase' of null
  at feed.js:5 [var id = user.name.toLowerCase();]
~~~

Gasp! Shouldn't this error have been caught and handled? Of course not--we never 
put any provisions to catch it. No problem, we can rewrite that `getFeed()` 
function to put its contents in a try/catch block.

~~~ js
getFeed = function(user, done) {
  try {
    var id = user.name.toLowerCase();

    $.get('/user/'+id+'/feeds.json', function(data) {
      if (data.entries)
        done(null, data);
      else
        done("No such user");
    });
  }
  catch (err) { /* <-- alright, let's relay some errors to the callback. */
    done(err);
  }
});
~~~

This works as expected, but wrapping all your functions in a try/catch blocks
cat be a very cathartic exercise. Safe-async to the rescue! Simply wrap your
function inside `safe(...)` and it'll take care of that for you.

Instead of writing `x = function(a,b,c,done) { ... }`, use `x =
safe(function(a,b,c,next) { ...  });`.

~~~ js
var safe = require('safe-async');

// Wrap your function inside `safe(...)`.
getFeed = safe(function(user, next) {
  var id = user.name.toLowerCase();

  $.get('/user/'+id+'/feeds.json', function(data) {
    if (data.entries)
      next.ok(data);
    else
      next.err("No such user");
  });
});
~~~

Now you got your errors trapped and passed for you. Let's try to consume 
`getFeed()` again:

~~~ js
var john = null;
getFeed(john, function(err, data) {
  if (err) {
    console.log("Uh oh! Caught an error.");
    console.log("=> "+ err);
    return;
  }
  console.log("John's entries:", data);
});
~~~

This now catches the error in `err` as we expected.

~~~ js
Uh oh! Caught an error.
=> TypeError: Cannot call method 'toLowerCase' of null
~~~

### Deep error catching

"So what? We can easily write this decorator without safe-async," you may be 
thinking. In fact, it's this very line of thinking that got me to writing 
safe-async in the first place.

Let's move on to a more complex example. Let's say we're writing an async 
function to fetch some data, crunch it, and return it.

~~~ js
/*
 * Fetches posts and gets the title of the first post.
 */
getFirstPost = function(done) {
  fs.readFile('posts.json', function(err, data) {
    if (err) return done(err);
    var post = data.entries[0].title;
    done(null, post);
  });
};
~~~

Let's use it:

~~~ js
getFirstPost(function(title) {
  $("h1").html(title);
});
~~~

It works, but it'll get you an unexpected result in some circumstances. What if 
`data.entries` is empty?

~~~ js
TypeError: Cannot read property 'title' of undefined
  at getfirstpost.js:6 [data.entries[0].title]
~~~

Uh oh: we have an error that happens in an async callback. We need to catch that 
too. Without safe-async, we may need to do 2 try/catch blocks: one for inside the 
function body, and another for inside the callback function's body. This is 
borderline asinine.

~~~ js
getFirstPost = function(next) {
  try {
    fs.readFile('posts.json', function(err, data) {
      try {
        if (err) return done(err);
        var post = data.entries[0].title;
        next(null, post);
      }
      catch (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
}
~~~

Safe-async provides a `next.wrap()` function that wraps any new callback for
you, which ensures that any errors it throws gets propagated properly. That
colossal function can be written more concisely with safe-async:

~~~ js
getFirstPost = safe(function(next) {
  fs.readFile('posts.json', next.wrap(function(err, data) {
    var post = data.entries[0].title;
    next.ok(post);
  }));
});
~~~

Note that we've also gotten rid of the `if (err) return done(err)` line: this is 
used to ensure that errors are propagated when `fs.readFile()` fails. There's no 
need for this anymore, since [next.wrap()](#nextwrap) already assumes an
error is passed to it when there's a first argument.

Working with promises
---------------------

Get Promise support by tying it in with your favorite Promise library. You can 
swap it out by changing [safe.promise](#safepromise) to the provider of 
[when.js], [q.js], [promise.js] or anything else that follows their API.

~~~ js
var safe = require('safe-async');

safe.promise = require('q').promise;
safe.promise = require('when').promise;
safe.promise = require('promise');
~~~

### Call it with promises or not

Just write any safe-async-powered async function and it can work with Node-style 
callbacks or promises. The same `getFirstPost()` function we wrote can be used 
as a promise:

~~~ js
// As promises
getFirstPost()
  .then(function(title) {
    $("h1").html(title);
  });
~~~

or it can be invoked with a callback:

~~~ js
// As a Node-style async function
getFirstPost(function(err, title) {
  $("h1").html(title);
});
~~~

### Use it to run promises

In the real world, you may be using libraries that only support Promises, and 
have it play safe with libraries that use traditional callbacks.

Safe-async helps you with this. Any safe-powered function you write can use 
promises. Instead of using the `next()` callback, make it return a promise object: 
safe automatically knows what to do.

~~~ js
getFirstPost = safe(function() {
  return $.get("/posts.json")
  .then(function(data) {
    return data.entries[0];
  })
  .then(function(post) {
    return post.title;
  });
});
~~~

You now get a function that can be used as a promise or an async function.

~~~ js
getFirstPost(function(err, data) {
  // used with a callback
});

getFirstPost()
.then(function(data) {
  // used as a promise
});
~~~

API
---

### `safe(fn)`

A decorator that creates a function derived from `fn`, enhanced with safe-async
superpowers.

When this new function is invoked (`getName` in the example below), it runs `fn` 
with the same arguments (`[a]` below), except with the last callback replaced 
with a new callback called [next()](#next).

When `next()` is invoked inside `[a]`, the callback given (`[b]`) will run.
([next()](#next) is described in detail later below.)

~~~ js
getName = safe(function(next) { //[a]
  next("John");
});

getName(function(err, name) { //[b]
  alert("Hey " + name);
});
~~~

__Arguments:__ All arguments will be passed through. In the example below, the 
names passed onto `man` and `companion` are passed through as usual, but the 
last argument (a function) has been changed to `next`.

~~~ js
getMessage = safe(function(man, companion, next) {
  var msg = "How's it goin, " + man + " & " + companion);
  next(msg);
});

getMessage("Doctor", "Donna", function(err, msg) {
  alert(msg);
  /* => "How's it goin, Doctor & Donna" */
});
~~~

__Errors:__ Any errors thrown inside `fn` will be passed the callback.

~~~ js
getName = safe(function(next) {
  var name = user.toUpperCase();
  next("John");
});

getName(function(err, data) {
  if (err) {
    /* err.message === "Cannot call method 'toUpperCase' of undefined" */
  }
});
~~~

__Promises:__ The resulting function can be used as a promise as well.


~~~ js
getName = safe(function(next) {
  next.ok("John");
});

getName()
  .then(function(name) {
    alert("Name: "+name);
  });
~~~

----

### `safe.promise`

The promise provider function that allows you to plug in the promise library of
your choice.

| Provider     | Code                                      |
| ------------ | ----------------------------------------- |
| [q.js]       | `safe.promise = require('q').promise;`    |
| [when.js]    | `safe.promise = require('when').promise;` |
| [promise.js] | `safe.promise = require('promise');`      |
| [rsvp.js]    | `safe.promise = require('rsvp').Promise;` |

`safe.promise` is expected to be a function used to create promises in this
manner below. Most promise libraries implement a function similar to this.

~~~ js
var promise = safe.promise(function(ok, err, progress) {
  ok("This returns a result");
  err("This returns an error");
  progress("This sends progress updates");
});
~~~

----

### `next()`

Resolves the async (success or error) by resolving the promise or running the 
callback.

It can return a success in these ways:

 * `next(null, result, [args...])`
 * `next.ok(result, [args...])`

or an error like so:

 * `next(msg)` -- return an error
 * `next.err(msg)` -- return an error

That is, you invoke it as `next(err, data)` as if it was the callback.

~~~ js
getName = safe(function(next) {
  next(null, "John");
});

getName(function(err, name) {
  alert("Hey " + name);
});
~~~

__Returning errors:__ You may return errors by invoking `next(error)`, or 
`next.err(error)`, or `throw`ing something.

~~~ js
getName = safe(function(next) {
  throw new Error("Something happened");
}

getName(function(err, name) {
  if (err) {
    alert(err.message); //=> "Something happened"
  }
});
~~~

__Wrapping other callbacks:__ When `next.wrap()` is invoked with a function as 
an argument, it wraps ("decorates") that function to ensure that any errors it 
produces is propagated properly. See [next.wrap()](#next-wrap).

~~~ js
getArticles = safe(function(next) {
  $.get('/articles.json', next(function(data) {
    var articles = data.articles;
    next(articles);
  }));
};

getArticles(function(err, articles) {
  if (err)
    console.error("Error:", err);
    /*=> "TypeError: cannot read property 'articles' of undefined" */
  else
    console.log("Articles:", articles);
});
~~~

__With promises:__ You can also return a promise from the function. Safe-async 
will automatically figure out what to do from that.

~~~ js
getFirstPost = safe(function() {
  return $.get("/posts.json")
  .then(function(data) {
    return data.entries[0];
  })
  .then(function(post) {
    return post.title;
  });
});
~~~

You now get a function that can be used as a promise or an async function.

~~~ js
getFirstPost(function(err, data) {
  // used with a callback
});

getFirstPost()
.then(function(data) {
  // used as a promise
});
~~~

----

### `next.ok()`

Returns a result. This is the same as calling `next()`.

~~~ js
getName = safe(function(next) {
  if (user.name)
    next(user.name);
  else
    throw "User has no name";
}
~~~

----

### `next.err()`

Returns an error. This is the same as `throw`ing an error, but is convenient
when used inside deeper callbacks that you can't wrap with
[next.wrap](#next-wrap).

~~~ js
getName = safe(function(next) {
  $.get("/user.json")
  .then(function(data) {
    if (!data.name)
      next.err("oops, no name here");
  })
}
~~~

----

### `next.wrap()`

Wraps a function ("decorates") to ensure that all errors it throws are
propagated properly.

When `next()` is invoked with a function as an argument, it works the same way
as `next.wrap()`.

In this example below, any errors happening within the function `[a]` will be
reported properly.

~~~ js
getArticles = safe(function(next) {
  fs.readFile('/articles.json', next.wrap(function(err, data) { //[a]
    var articles = data.articles;
    next(articles);
  }));
};

getArticles(function(err, articles) {
  if (err)
    console.error("Error:", err);
    /*=> "TypeError: cannot read property 'articles' of undefined" */
  else
    console.log("Articles:", articles);
});
~~~

Also, if `fs.readFile` will fail, it will invoke the decorated callback 
(produced by `next.wrap`) with an error as the first argument. When the 
decorated callback receives a first argument, it assumes its an error and will 
propagate it.

---

### `next.cwrap()`

Wraps a function ("decorates") to ensure that all errors it throws are
propagated properly.

`cwrap` is short for "catch-only wrap" -- unlike [next.wrap()](#nextwrap), 
  `cwrap` does not care about arguments passed onto the decorated function. It 
  only catches thrown errors, nothing more.

This is great for wrapping callbacks that don't accept error arguments.
It doesn't expect the first argument of the function to be an error, unlike 
[next.wrap()](#nextwrap).  In this example below, the wrapped function expects a 
`chunk` argument, which is not an error.

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

Practical uses
--------------

### [Express]

Safe-async makes working with promises easy. It ensures that errors are 
propogated to the `next` callback, so you get errors rendered to your browser 
instead of failing silently.

~~~ coffee
app.get '/feed', safe (req, res, next) ->
  Article.fetchAll()
  .then (articles) ->
    res.locals.articles = articles
    res.render "index"
~~~

Acknowledgements
----------------

© 2013, Rico Sta. Cruz. Released under the [MIT License].

[MIT License]: http://www.opensource.org/licenses/mit-license.php
[when.js]: https://github.com/cujojs/when
[q.js]: https://github.com/kriskowal/q
[promise.js]: https://github.com/then/promise
[rsvp.js]: https://github.com/tildeio/rsvp.js
[async.js]: https://github.com/caolan/async
[Express]: http://expressjs.com


## Thanks

**safe-async** © 2013-2014+, Rico Sta. Cruz. Released under the [MIT License].<br>
Authored and maintained by Rico Sta. Cruz with help from [contributors].

> [ricostacruz.com](http://ricostacruz.com) &nbsp;&middot;&nbsp;
> GitHub [@rstacruz](https://github.com/rstacruz) &nbsp;&middot;&nbsp;
> Twitter [@rstacruz](https://twitter.com/rstacruz)

[MIT License]: http://mit-license.org/
[contributors]: http://github.com/rstacruz/safe-async/contributors

[![Status](https://travis-ci.org/rstacruz/safe-async.svg?branch=master)](https://travis-ci.org/rstacruz/safe-async)
[![npm version](https://img.shields.io/npm/v/safe-async.png)](https://npmjs.org/package/safe-async "View this project on npm")
