safe-async.js
=============

**Standardizes the interface for async APIs.**

It helps you write great async API. It catches errors for you. It makes your 
async functions work with promises or callbacks.

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
great error handling (`q.try`).

What it's not
-------------

 * It's not [async.js], because that lets you work many async callback-functions 
 in parallel (among other things).

 * It's not [q.js] or [when.js] or [rsvp.js] or [promise.js],
which helps you write promise functions and work with many promise objects.
However, you can hook up safe-async to use any of those to generate
promises.

Get started in 20 seconds
-------------------------

Install:

~~~
$ npm install safe-async
~~~

Then use it. Bonus: you can optionally hook in a promise provider if you want to
take advantage of the promise features. (See [safe.promise](#safe-promise))

~~~ js
var safe = require('safe-async');
safe.promise = require('q').promise;
~~~

Instead of writing an async function like so:

~~~ js
// Old-fashioned callback way
x = function(a, b, c, done) {
  if (success)
    done(null, "Result here");
  else
    done("uh oh, error");
};
~~~

Wrap that function in `safe` instead. (See [safe()](#safe))

~~~ js
// New safe-async way
x = safe(function(a, b, c, next) {
  if (success)
    next("Result here");
  else
    throw "uh oh, error";
});
~~~

When invoking another async function, wrap the callback in `next.wrap` too. This will catch
errors inside that function: (See [next.wrap()](#next-wrap))

~~~ js
x = safe(function(a, b, c, next) {
  $.get('/', next.wrap(function() { /* <-- here */
    if (success)
      next("Result here");
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
safe(function(a,b,c,next) { ...  });`. Notice how errors are now simply
`throw`n instead of being passed manually.

~~~ js
var safe = require('safe');

// Wrap your function inside `safe(...)`.
getFeed = safe(function(user, next) {
  var id = user.name.toLowerCase();

  $.get('/user/'+id+'/feeds.json', function(data) {
    if (data.entries)
      next(data);
    else
      throw "No such user";
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
getFirstPost = function(next) {
  $.get('/posts.json', function(data) {
    var post = data.entries[0].title;
    next(null, post);
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
    $.get('/posts.json', function(data) {
      try {
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
  $.get('/posts.json', next.wrap(function(data) {
    var post = data.entries[0].title;
    next(post);
  }));
});
~~~

Working with promises
---------------------

Get Promise support by tying it in with your favorite Promise library. You can 
swap it out by changing `safe.promise` to the provider of [when.js], [q.js], 
     [promise.js] or anything else that follows their API.

~~~ js
var safe = require('safe');

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

### safe(fn)

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

All arguments will be passed through. In the example below, the names passed
onto `man` and `companion` are passed through as usual, but the last argument (a
    function) has been changed to `next`.

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

Any errors thrown inside `fn` will be passed the callback.

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

### safe.promise

The promise provider function that allows you to plug in the promise library of
your choice.

| Provider     | Code                                      |
| --           | --                                        |
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

### next()

Returns an error, or a result, to the callback.

You can return a result by calling `next(result)`.

~~~ js
getName = safe(function(next) {
  next("John");
});

getName(function(err, name) {
  alert("Hey " + name);
});
~~~

#### Returning errors

You may also return errors. You can do this by `throw`ing.

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

#### Wrapping other callbacks

When `next()` is invoked with a function as an argument, it wraps ("decorates")
that function to ensure that any errors it produces is propagated properly. See
[next.wrap()](#next-wrap).

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

#### With promises

You can also return a from the function. safe will automatically figure out
what to do from that.

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

### next.ok()

Returns a result. This is the same as calling `next()`.

~~~ js
getName = safe(function(next) {
  if (user.name)
    next(user.name);
  else
    throw "User has no name";
}
~~~

### next.err()

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

### next.wrap()

Wraps a function ("decorates") to ensure that all errors it throws are
propagated properly.

When `next()` is invoked with a function as an argument, it works the same way
as `next.wrap()`.

In this example below, any errors happening within the function `[a]` will be
reported properly.

~~~ js
getArticles = safe(function(next) {
  $.get('/articles.json', next.wrap(function(data) { //[a]
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

[when.js]: https://github.com/cujojs/when
[q.js]: https://github.com/kriskowal/q
[promise.js]: https://github.com/then/promise
[rsvp.js]: https://github.com/tildeio/rsvp.js
[async.js]: https://github.com/caolan/async
