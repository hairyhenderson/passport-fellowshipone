'use strict'
var should = require('should'),
   util = require('util'),
   sinon = require('sinon'),
   Strategy = require('passport-fellowshipone').Strategy;

describe('passport-fellowshipone strategy', function() {
   var strategy, apiURL, churchCode, staging;

   describe('provider', function() {
      before(function() {
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
         before(function() {
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
         before(function() {
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
         before(function() {
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
      before(function() {
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
})
