'use strict'
var should = require('should'),
   util = require('util'),
   fellowshipone = require('passport-fellowshipone');

describe('passport-fellowshipone', function() {
   it('should report a version', function() {
      fellowshipone.version.should.be.a.string
   })
})
