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

 * Ensures that errors are proper `Error` objects.

 * It makes your function work with async callbacks or promises with no extra 
 code.

 * Works for Node.js and the browser.

 * It's pretty damn small (~70loc).

What does it solve
------------------

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
  name: null  // <- uh oh
}; 

getFeed(john, function(err, data) {
  if (err) console.log("Error:", err);
  console.log("John's entries:", data);
});

TypeError: Cannot call method 'toLowerCase' of null
  at feed.js:5 [var id = user.name.toLowerCase();]
~~~

Gasp! Shouldn't this error have been thrown? Of course not--we never put any 
provisions to catch it. No problem, we can rewrite that `getFeed()` function to 
put its contents in a try/catch block.

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
  } catch (err) {
    done(err);
  }
});
~~~

This works as expected, but wrapping all your functions in a try/catch blocks 
cat be a very cathartic exercise.

Defer.js to the rescue! Simply decorate your function and it'll take care of 
that for you.

~~~ js
var defer = require('defer');

// Wrap your function inside `defer(...)`.
getFeed = defer(function(user, next) {
  var id = user.name.toLowerCase();

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
=> TypeError: Cannot call method 'toLowerCase' of null
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

### Use it to run promises

In the real world, you may be using libraries that only support Promises, and 
have it play safe with libraries that use traditional callbacks.

Defer.js helps you with this. Any defer-powered function you write can use 
promises. Instead of using the `next()` callback, make it return a function: 
defer automatically knows what to do.

~~~ js
getFirstPost = defer(function() {
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

API
---

### defer(fn)

A decorator that creates a function derived from `fn`, enhanced with defer.js
superpowers.

When this new function is invoked (`getName` in the example below), it runs `fn` 
with the same arguments (`[a]` below), except with the last callback replaced 
with a new callback called [next()](#next).

When `next()` is invoked inside `[a]`, the callback given (`[b]`) will be ran.  
([next()](#next) is described in detail later below.)

~~~ js
getName = defer(function(next) { // [a]
  next("John");
});

getName(function(err, name) { // [b]
  alert("Hey " + name);
});
~~~

All arguments will be passed through. In the example below, the names passed 
onto `man` and `companion` are passed through as usual, but the last argument (a 
    function) has been changed to `next`.

~~~ js
getMessage = defer(function(man, companion, next) {
  var msg = "How's it goin, " + man + " & " + companion);
  next(msg);
});

getMessage("Doctor", "Donna", function(err, msg) {
  alert(msg); //=> "How's it goin, Doctor & Donna"
});
~~~

Any errors thrown inside `fn` will be passed the callback.

~~~ js
getName = defer(function(next) {
  var name = user.toUpperCase();
  next("John");
});

getName(function(err, data) {
  if (err) {
    /* err.message === "Cannot call method 'toUpperCase' of undefined" */
  }
});
~~~

### next()

Returns an error, or a result, to the callback.

You can return a result by calling `next(result)`.

~~~ js
getName = defer(function(next) {
  next("John");
});

getName(function(err, name) {
  alert("Hey " + name);
});
~~~

#### Returning errors

You may also return errors. An error anything that is an instance of `Error`, 
    and will be treated differently from non-errors.

~~~ js
getName = defer(function(next) {
  next(new Error("Something happened"));
}

getName(function(err, name) {
  if (err) {
    alert(err.message); //=> "Something happened"
  }
});
~~~

#### next.ok() and next.err()

Alternatively, you may also use [next.ok()](#next-ok) and 
[next.err()](#next-err) if you prefer to be more explicit. `next.ok()` works the 
same way as `next()`, while `next.err()` ensures that the given error is made 
into an `Error` object.

~~~ js
getName = defer(function(next) {
  if (user.name) {
    next.ok(user.name);
  } else {
    next.err("User has no name");
  }
}

getName(function(err, name) {
  if (err) {
    alert(err.message); //=> "Something happened"
  }
});
~~~

You don't need to do that, though: any errors you throw are treated the same 
way.

~~~ js
getName = defer(function(next) {
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
getArticles = defer(function(next) {
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

You can also return a from the function. Defer will automatically figure out 
what to do from that.

~~~ js
getFirstPost = defer(function() {
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


### next.ok()

Returns a result. See [next.err()](#next-err) for examples.

### next.err()

Returns an error.

~~~ js
getName = defer(function(next) {
  if (user.name)
    next.ok(user.name);
  else
    next.err("User has no name");
}
~~~

#### Coercion

It coerces anything given to it as an object of `Error`, if it isn't yet.

~~~ js
getName = defer(function(next) {
  if (user.name)
    next.ok(user.name);
  else
    next.err("User has no name");
}

getName(function(err, name) {
  if (err) {
    console.log(err.constructor); //=> "Error"
    console.log(err.message);     //=> "User has no name"
  }
});
~~~

### next.wrap()

Wraps a function ("decorates") to ensure that all errors it throws are 
propagated properly.

When `next()` is invoked with a function as an argument, it works the same way 
as `next.wrap()`.

In this example below, any errors happening within the function `[a]` will be 
reported properly.

~~~ js
getArticles = defer(function(next) {
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
