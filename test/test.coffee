require './setup'

defer = require '..'
Q = require 'q'
fn = null
timeout = (fn) -> setTimeout fn, 20

# ----------------------------------------------------------------------------
describe 'async as async', ->
  it 'should work as async', (done) ->
    fn = defer (next) ->
      next("hi")

    fn (e, message) ->
      throw e if e
      expect(message).eql "hi"
      done()

  it 'should work as async with 1 argument', (done) ->
    fn = defer (name, next) ->
      next("hi #{name}")

    fn 'John', (e, message) ->
      throw e if e
      expect(message).eql "hi John"
      done()

  it 'should work as async with 2 args', (done) ->
    fn = defer (dude, lady, next) ->
      next("hi #{dude} and #{lady}")

    fn 'John', 'Ydoneo', (e, message) ->
      throw e if e
      expect(message).eql "hi John and Ydoneo"
      done()

  it 'should work with error', (done) ->
    err = new Error("Uh oh")

    fn = defer (next) ->
      next(err)

    fn (e) ->
      expect(e).eql err
      done()

  it 'throwing errors', (done) ->
    err = new Error("oops")
    fn = defer (next) ->
      throw err

    fn (e) ->
      expect(e).eql err
      done()

  it 'return values', ->
    fn = defer (next) -> 42

    expect(fn(->)).eql 42

  it '.ok', (done) ->
    fn = defer (next) -> next.ok 42
    fn (err, data) ->
      throw err if err
      expect(data).eql 42
      done()

  it '.err', (done) ->
    fn = defer (next) -> next.err "Oops"
    fn (err, data) ->
      expect(err).instanceof Error
      expect(err.message).eql "Oops"
      expect(data).undefined
      done()

  it '.wrap', (done) ->
    fn = defer (next) ->
      setTimeout (next.wrap -> a.b.c), 0

    fn (err, data) ->
      expect(err).instanceof Error
      expect(err.message).match /a is not defined/
      expect(data).undefined
      done()

  it 'this', (done) ->
    a = { name: "Hello" }

    a.fn = defer (next) ->
      expect(@name).eql "Hello"
      next()

    a.fn(done)

# ----------------------------------------------------------------------------
describe 'async as promise', ->
  beforeEach -> defer.promise = require('q').promise
  afterEach ->  defer.promise = undefined

  it 'should return a promise', ->
    fn = defer (next) ->
      next("hi")

    expect(fn("hello").then).function

  it 'should work', (done) ->
    fn = defer (next) ->
      next("hi")

    fn("hello").then (message) ->
      expect(message).eql "hi"
      done()

  it '.ok', (done) ->
    fn = defer (next) -> next.ok 42
    fn().then (data) ->
      expect(data).eql 42
      done()

  it '.err', (done) ->
    fn = defer (next) -> next.err "Oops"
    fn().then null, (err) ->
      expect(err).instanceof Error
      expect(err.message).eql "Oops"
      done()

  it '.wrap', (done) ->
    fn = defer (next) ->
      setTimeout (next.wrap -> a.b.c), 0

    fn().then null, (err) ->
      expect(err).instanceof Error
      expect(err.message).match /a is not defined/
      done()

# ----------------------------------------------------------------------------
describe 'promise as async', ->
  it 'should work with ok', (done) ->
    fn = defer ->
      Q.promise (ok, fail) ->
        ok "hi"

    fn (e, msg) ->
      throw e if e
      expect(msg).eql "hi"
      done()

  it 'should work with fail', (done) ->
    fn = defer ->
      Q.promise (ok, fail) ->
        fail "hi"

    fn (e, msg) ->
      expect(e).instanceof Error
      expect(e.message).eql 'hi'
      done()

# ----------------------------------------------------------------------------
describe 'promise as promise', ->
  beforeEach -> defer.promise = require('q').promise
  afterEach ->  defer.promise = undefined

  it 'should work with ok', (done) ->
    fn = defer ->
      Q.promise (ok, fail) ->
        ok "hi"

    fn().then (msg) ->
      expect(msg).eql "hi"
      done()

  it 'should work with fail', (done) ->
    fn = defer ->
      Q.promise (ok, fail) ->
        fail "hi"

    fn().then null, (msg) ->
      expect(msg.message).eql "hi"
      done()

# ----------------------------------------------------------------------------
describe 'error catching', ->
  it 'should work', (done) ->
    fn = defer (next) ->
      timeout next ->
        throw new Error("Hi")

    fn (e, msg) ->
      expect(e.message).eql "Hi"
      done()
