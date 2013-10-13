require './setup'
defer = require '..'
Q = require 'q'
fn = null

# ----------------------------------------------------------------------------
r = ->
  describe 'async as promise', ->
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

  describe 'promise as promise', ->
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
describe 'q.js', ->
  beforeEach -> defer.promise = require('q').promise
  afterEach ->  defer.promise = undefined
  r.apply this

describe 'when.js', ->
  beforeEach -> defer.promise = require('when').promise
  afterEach ->  defer.promise = undefined
  r.apply this

describe 'promise.js', ->
  beforeEach -> defer.promise = require('promise')
  afterEach ->  defer.promise = undefined
  r.apply this

describe 'rsvp.js', ->
  beforeEach -> defer.promise = require('rsvp').Promise
  afterEach ->  defer.promise = undefined
  r.apply this

