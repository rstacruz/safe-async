# Defer.js

Async helper.

When to use it
--------------

**Protip:** Any time you're writing a function that takes a callback, use 
defer.js.

Hate writing async functions? I used to, too. Defer.js solves many headaches 
with writing asynchronous functions. It's great for writing API libraries or 
models that do things asynchronously.

 * It ensures proper error propagation.

 * It makes your function work with async callbacks or promises with no extra 
 code.

 * It's pretty damn small (~70loc).

### Error catching

Perhaps the most inelegant thing about asynchronous JavaScript callbacks is 
error handling. Or rather: *proper* error handling.

To illustrate how this can get particularly hairy, let's start with an innocent 
function (`getFeed()`) that expects a Node-style callback:

~~~ js
/**
 * Fetch the feed user (via AJAX) for a given `user`.
 */
getFeed = function(user, done) {
  var id = user.account.id;

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
  account: { id: 189238, name: "john_m" },
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
var john = null; // <- uh oh

getFeed(john, function(err, data) { /*...*/ });

TypeError: Cannot read property 'id' of undefined
  at feed.js:2 [var id = user.account.id;]
~~~

Gasp! Shouldn't this error have been thrown? Of course not--we never put any 
provisions to catch it. No problem, we can rewrite that `getFeed()` function to 
put its contents in a try/catch block like so.

~~~ js
getFeed = function(user, done) {
  try {
    /*
     * ...the rest of your function body here
     */
  } catch (e) {
    done(e);
  }
});
~~~

This works as expected, but wrapping all your async functions in try/catch 
blocks cat be a very cathartic exercise.

Defer.js to the rescue! Simply decorate your function and it'll take care of 
that for you.

~~~ js
var defer = require('defer');

// Wrap your function inside `defer(...)`.
getFeed = defer(function(user, next) {
  var id = user.account.id;

  $.get('/user/'+id+'/feeds.json', function(data) {
    if (data.entries)
      next(data);
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

~~~
Uh oh! Caught an error.
=> Cannot read property 'id' of undefined
~~~

### Deep error catching

"So what? We can easily write this decorator without defer.js," you may be 
thinking. In fact, it's this very line of thinking that got me to writing 
defer.js in the first place.

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

In certain cirtumstances, this will get you an unexpected result. What if 
`data.entries` is empty? You'll get this error:

~~~ js
TypeError: Cannot read property 'title' of undefined
  at getfirstpost.js:6 [data.entries[0].title]
~~~

Uh oh: we have an error that happens in an async callback. We need to catch that 
too. Without defer.js, we may need to do 2 try/catch blocks: one for inside the 
function body, and another for inside the callback function's body:

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

Defer.js provides a `next.wrap()` function that wraps any new callback for you, 
  which ensures that any errors it throws gets propagated properly.  That same 
  function can now be rewritten as:

~~~ js
getFirstPost = defer(function(next) {
  $.get('/posts.json', next.wrap(function(data) {
    var post = data.entries[0].title;
    next(post);
  }));
});

### Call it with promises or not

Just write any defer.js-powered async function and it can work with Node-style 
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
getFirstPost(function(title) {
  $("h1").html(title);
});
~~~

