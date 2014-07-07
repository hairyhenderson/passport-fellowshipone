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
            apiURL = 'http://example.com'
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
         r.expects('get').yields('ERROR')

         strategy.userProfile(null, null, {
            userURL: 'http://example.com'
         }, function(err, user) {
            err.should.exist
            verifyAll()
            done()
         })
      })
      it('yields error when GET returns non-OK status', function(done) {
         r.expects('get').yields(null, {
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
         r.expects('get').yields(null, {
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

      it('yields error given reply object without person property', function(done) {
         r.expects('get').yields(null, {
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

   })
})
