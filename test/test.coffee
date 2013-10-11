require './setup'

defer = require '..'
Q = require 'q'
fn = null

describe 'async usage', ->
  it 'should work as async', (ok) ->
    fn = defer (next) ->
      next("hi")

    fn (e, message) ->
      expect(e).undefined
      expect(message).eql "hi"
      ok()

  it 'should work as async with 1 argument', (ok) ->
    fn = defer (name, next) ->
      next("hi #{name}")

    fn 'John', (e, message) ->
      expect(e).undefined
      expect(message).eql "hi John"
      ok()

  it 'should work as async with 2 args', (ok) ->
    fn = defer (dude, lady, next) ->
      next("hi #{dude} and #{lady}")

    fn 'John', 'Yoko', (e, message) ->
      expect(e).undefined
      expect(message).eql "hi John and Yoko"
      ok()

  it 'should work with error', (ok) ->
    err = new Error("Uh oh")

    fn = defer (next) ->
      next(err)

    fn (e) ->
      expect(e).eql err
      ok()

  it 'throwing errors', (ok) ->
    err = new Error("oops")
    fn = defer (next) ->
      throw err

    fn (e) ->
      expect(e).eql err
      ok()

describe 'promise usage', ->
  it 'should return a promise', ->
    fn = defer (next) ->
      next("hi")

    expect(fn("hello").then).function

  it 'should work', (ok) ->
    fn = defer (next) ->
      next("hi")

    fn("hello").then (message) ->
      expect(message).eql "hi"
      ok()


