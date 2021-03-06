require './setup'

safe = require '..'
Q = require 'q'
fn = null
timeout = (fn) -> setTimeout fn, 20

# ----------------------------------------------------------------------------
describe 'async as async', ->
  it 'should work as async', (done) ->
    fn = safe (next) ->
      next.ok("hi")

    fn (e, message) ->
      throw e if e
      expect(message).eql "hi"
      done()

  it 'next(null, ok)', (done) ->
    fn = safe (next) ->
      next(null, "hi")

    fn (e, message) ->
      throw e if e
      expect(message).eql "hi"
      done()

  it 'should work as async with 1 argument', (done) ->
    fn = safe (name, next) ->
      next.ok("hi #{name}")

    fn 'John', (e, message) ->
      throw e if e
      expect(message).eql "hi John"
      done()

  it 'should work as async with 2 args', (done) ->
    fn = safe (dude, lady, next) ->
      next.ok("hi #{dude} and #{lady}")

    fn 'John', 'Ydoneo', (e, message) ->
      throw e if e
      expect(message).eql "hi John and Ydoneo"
      done()

  it 'should work with error (throw)', (done) ->
    err = new Error("Uh oh")
    fn = safe (next) -> throw err

    fn (e) ->
      expect(e).eql err
      done()

  it 'should work with error (next.err)', (done) ->
    err = new Error("Uh oh")
    fn = safe (next) -> next.err err

    fn (e) ->
      expect(e).eql err
      done()

  it 'throwing errors', (done) ->
    err = new Error("oops")
    fn = safe (next) ->
      throw err

    fn (e) ->
      expect(e).eql err
      done()

  it 'return values', ->
    fn = safe (next) -> 42

    expect(fn(->)).eql 42

  it '.ok', (done) ->
    fn = safe (next) -> next.ok 42
    fn (err, data) ->
      throw err if err
      expect(data).eql 42
      done()

  it '.err', (done) ->
    fn = safe (next) -> next.err new Error("Oops")
    fn (err, data) ->
      expect(err).instanceof Error
      expect(err.message).eql "Oops"
      expect(data).undefined
      done()

  it '.wrap', (done) ->
    fn = safe (next) ->
      setTimeout (next.wrap -> a.b.c), 0

    fn (err, data) ->
      expect(err).instanceof Error
      expect(err.message).match /a is not defined/
      expect(data).undefined
      done()

  it '.cwrap', (done) ->
    fn = safe (next) ->
      setTimeout (next.cwrap -> a.b.c), 0

    fn (err, data) ->
      expect(err).instanceof Error
      expect(err.message).match /a is not defined/
      expect(data).undefined
      done()

  it '.wrap errors args', (done) ->
    fn = safe (next) ->
      cb = (next.wrap -> 42)
      cb(new Error("uh oh"))

    fn (err, data) ->
      expect(err).instanceof Error
      expect(err.message).match /uh oh/
      expect(data).undefined
      done()

  it '.cwrap shouldnt care about args', (done) ->
    fn = safe (next) ->
      cb = (next.cwrap -> 42)
      cb(new Error("uh oh"))
      next()

    fn (e) ->
      throw e if e
      done()

  it 'this', (done) ->
    a = { name: "Hello" }

    a.fn = safe (next) ->
      expect(@name).eql "Hello"
      next()

    a.fn(done)

# ----------------------------------------------------------------------------
describe 'promise as async', ->
  it 'should work with ok', (done) ->
    fn = safe ->
      Q.promise (ok, fail) ->
        ok "hi"

    fn (e, msg) ->
      throw e if e
      expect(msg).eql "hi"
      done()

  it 'should work with fail', (done) ->
    fn = safe ->
      Q.promise (ok, fail) ->
        fail "oops"

    fn (e, msg) ->
      expect(e).eql "oops"
      done()

# ----------------------------------------------------------------------------
describe 'error catching', ->
  it 'should work', (done) ->
    fn = safe (next) ->
      timeout next.wrap ->
        throw new Error("Hi")

    fn (e, msg) ->
      expect(e.message).eql "Hi"
      done()
