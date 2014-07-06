'use strict'
var should = require('should'),
   util = require('util'),
   Strategy = require('passport-fellowshipone').Strategy;

describe('passport-fellowshipone strategy', function() {
   var strategy

   before(function() {
      strategy = new Strategy({
         churchCode: 'MYCHURCH',
         staging: true,
         consumerKey: 'ckey',
         consumerSecret: 'csecret'
      }, function() {})
   })

   it('should be named fellowshipone', function() {
      strategy.name.should.eql('fellowshipone')
   })
})
