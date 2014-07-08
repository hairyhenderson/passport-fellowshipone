'use strict'
var should = require('should'),
   util = require('util'),
   sinon = require('sinon'),
   request = require('request'),
   Strategy = require('passport-fellowshipone').Strategy;

describe('passport-fellowshipone strategy', function() {
   var strategy, apiURL, churchCode, staging;

   var r;
   beforeEach(function() {
      request.get = function() {}
      r = sinon.mock(request)
   })
   afterEach(function() {
      r.restore()
   })

   function verifyAll() {
      r.verify()
   }

   describe('provider', function() {
      beforeEach(function() {
         strategy = new Strategy({
            consumerKey: 'ckey',
            consumerSecret: 'csecret'
         }, function() {})
      })

      it('is named fellowshipone', function() {
         strategy.name.should.eql('fellowshipone')
      })
   })

   describe('options', function() {
      describe('churchCode', function() {
         beforeEach(function() {
            churchCode = 'examplechurch'
            strategy = new Strategy({
               churchCode: churchCode,
               consumerKey: 'key',
               consumerSecret: 'secret'
            }, function() {})
         })

         it('sets apiURL', function() {
            strategy.options.should.have.property('apiURL', 'https://' + churchCode + '.fellowshiponeapi.com/v1')
         })
      })
      describe('staging', function() {
         beforeEach(function() {
            churchCode = 'examplechurch'
            strategy = new Strategy({
               churchCode: churchCode,
               staging: true,
               consumerKey: 'key',
               consumerSecret: 'secret'
            }, function() {})
         })

         it('adds \'staging\' subdomain to apiURL', function() {
            strategy.options.should.have.property('apiURL', 'https://' + churchCode + '.staging.fellowshiponeapi.com/v1')
         })
      })
      describe('apiURL', function() {
         beforeEach(function() {
            apiURL = 'http://example.com/api'
            strategy = new Strategy({
               churchCode: 'ignored',
               staging: true, // also ignored
               apiURL: apiURL,
               consumerKey: 'key',
               consumerSecret: 'secret'
            }, function() {})
         })

         it('sets requestTokenURL', function() {
            strategy.options.should.have.property('requestTokenURL', apiURL + '/Tokens/RequestToken')
         })
         it('sets accessTokenURL', function() {
            strategy.options.should.have.property('accessTokenURL', apiURL + '/Tokens/AccessToken')
         })
         it('sets userAuthorizationURL', function() {
            strategy.options.should.have.property('userAuthorizationURL', apiURL + '/PortalUser/Login')
         })
      })
   })

   describe('userAuthorizationParams', function() {
      beforeEach(function() {
         apiURL = 'http://example.com'
         strategy = new Strategy({
            apiURL: apiURL,
            consumerKey: 'key',
            consumerSecret: 'secret'
         }, function() {})
      })

      it('sends back oauth_callback', function() {
         strategy._callbackURL = 'foo'
         strategy.userAuthorizationParams({}).should.eql({
            oauth_callback: 'foo'
         })
      })
   })

   describe('userProfile', function() {
      beforeEach(function() {
         apiURL = 'http://example.com'
         strategy = new Strategy({
            apiURL: apiURL,
            consumerKey: 'key',
            consumerSecret: 'secret'
         }, function() {})
      })
      it('yields empty user given no params', function(done) {
         strategy.userProfile(null, null, null, function(err, user) {
            user.should.eql({})
            done()
         })
      })
      it('yields empty user given no userURL in params', function(done) {
         strategy.userProfile(null, null, {}, function(err, user) {
            user.should.eql({})
            done()
         })
      })
      it('yields error when GET errors', function(done) {
         r.expects('get').withArgs('http://example.com').yields('ERROR')

         strategy.userProfile(null, null, {
            userURL: 'http://example.com'
         }, function(err, user) {
            err.should.exist
            verifyAll()
            done()
         })
      })
      it('yields error when GET returns non-OK statuses', function(done) {
         r.expects('get').withArgs('http://example.com').yields(null, {
            statusCode: 404
         }, 'not found')

         strategy.userProfile(null, null, {
            userURL: 'http://example.com'
         }, function(err, user) {
            err.should.exist
            verifyAll()
            done()
         })
      })

      it('yields error given empty reply', function(done) {
         r.expects('get').withArgs('http://example.com').yields(null, {
            statusCode: 200
         })

         strategy.userProfile(null, null, {
            userURL: 'http://example.com'
         }, function(err, user) {
            err.should.exist

            verifyAll()
            done()
         })
      })

      it('yields error given reply object without correct properties', function(done) {
         r.expects('get').withArgs('http://example.com').yields(null, {
            statusCode: 200
         }, {})
         r.expects('get').withArgs('http://example.com/Communications').yields(null, {
            statusCode: 200
         }, {})

         strategy.userProfile(null, null, {
            userURL: 'http://example.com'
         }, function(err, user) {
            err.should.exist

            verifyAll()
            done()
         })
      })

      it('yields profile based on F1 Person record', function(done) {
         var f1person = {
            person: {
               '@id': 1234,
               '@uri': 'http://example.com',
               firstName: 'John',
               lastName: 'Doe'
            }
         }
         var f1comms = {
            communications: {
               communication: [{
                  communicationGeneralType: 'Email',
                  communicationValue: 'john@example.com',
                  communicationType: {
                     name: 'Email'
                  },
                  preferred: 'false'
               }]
            }
         }
         var expected = {
            id: 1234,
            uri: 'http://example.com',
            displayName: 'John',
            fullName: 'John Doe',
            email: 'john@example.com'
         }

         r.expects('get').yields(null, {
            statusCode: 200
         }, f1person)
         r.expects('get').yields(null, {
            statusCode: 200
         }, f1comms)

         strategy.userProfile(null, null, {
            userURL: 'http://example.com'
         }, function(err, user) {
            should(err).not.exist
            user.should.eql(expected)

            verifyAll()
            done()
         })
      })
   })
})
