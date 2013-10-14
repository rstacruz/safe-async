require './setup'
safe = require '..'
Q = require 'q'
fn = null

# ----------------------------------------------------------------------------
r = (options={}) ->
  describe 'promises', ->
    it 'progress', (done) ->
      promise = Q.promise (ok, err, prog) ->
        prog "100"
        ok()

      fn = safe -> promise

      fn().then null, null, (n) ->
        expect(n).eql "100"
      fn().then done

    if options.progress
      it 'progress via callback', (done) ->
        fn = safe (next) ->
          expect(next.progress).function
          next.progress "100"

        fn().then null, null, (n) ->
          expect(n).eql "100"
          done()

  describe 'async as promise', ->
    it 'should return a promise', ->
      fn = safe (next) ->
        next("hi")

      expect(fn("hello").then).function

    it 'should work', (done) ->
      fn = safe (next) ->
        next("hi")

      fn("hello").then (message) ->
        expect(message).eql "hi"
        done()

    it '.ok', (done) ->
      fn = safe (next) -> next.ok 42
      fn().then (data) ->
        expect(data).eql 42
        done()

    it '.err', (done) ->
      fn = safe (next) -> next.err new Error("Oops")
      fn().then null, (err) ->
        expect(err).instanceof Error
        expect(err.message).eql "Oops"
        done()

    it '.wrap', (done) ->
      fn = safe (next) ->
        setTimeout (next.wrap -> a.b.c), 0

      fn().then null, (err) ->
        expect(err).instanceof Error
        expect(err.message).match /a is not defined/
        done()

  describe 'promise as promise', ->
    it 'should work with ok', (done) ->
      fn = safe ->
        Q.promise (ok, fail) ->
          ok "hi"

      fn().then (msg) ->
        expect(msg).eql "hi"
        done()

    it 'should work with fail', (done) ->
      fn = safe ->
        Q.promise (ok, fail) ->
          fail "hi"

      fn().then null, (msg) ->
        expect(msg).eql "hi"
        done()

# ----------------------------------------------------------------------------
describe 'q.js', ->
  beforeEach -> safe.promise = require('q').promise
  afterEach ->  safe.promise = undefined
  r progress: true

describe 'when.js', ->
  beforeEach -> safe.promise = require('when').promise
  afterEach ->  safe.promise = undefined
  r progress: true

describe 'promise.js', ->
  beforeEach -> safe.promise = require('promise')
  afterEach ->  safe.promise = undefined
  r()

describe 'rsvp.js', ->
  beforeEach -> safe.promise = require('rsvp').Promise
  afterEach ->  safe.promise = undefined
  r()

