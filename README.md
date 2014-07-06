[![Build Status](https://secure.travis-ci.org/hairyhenderson/passport-fellowshipone.png)](http://travis-ci.org/hairyhenderson/passport-fellowshipone)
[![Coverage Status](https://coveralls.io/repos/hairyhenderson/passport-fellowshipone/badge.png)](https://coveralls.io/r/hairyhenderson/passport-fellowshipone)
[![Dependency Status](https://gemnasium.com/hairyhenderson/passport-fellowshipone.svg)](https://gemnasium.com/hairyhenderson/passport-fellowshipone)

# Passport-FellowshipOne

[Passport](http://passportjs.org/) strategy for authenticating with [Fellowship One](http://developer.fellowshipone.org) using the OAuth 1.0a API.

This module lets you authenticate using Fellowship One in your Node.js
applications. By plugging into Passport, Fellowship One authentication can be
easily and unobtrusively integrated into any application or framework that
supports [Connect](http://www.senchalabs.org/connect/)-style middleware,
including [Express](http://expressjs.com/).

## Install

    $ npm install passport-fellowshipone

## Usage

#### Configure Strategy

The Fellowship One authentication strategy authenticates users using a
Fellowship One account and OAuth 1.0a tokens. The strategy requires a `verify`
callback, which accepts these credentials and calls `done` providing a user, as
well as `options` specifying a developer key and callback URL.

    var FellowshipOneStrategy = require('passport-fellowshipone').Strategy;

    passport.use(new FellowshipOneStrategy({
		apiURL: 'https://MyChurch.staging.fellowshiponeapi.com/v1',
        consumerKey: F1_DEVELOPER_KEY,
        consumerSecret: F1_SECRET,
        callbackURL: "http://127.0.0.1:3000/auth/fellowshipone/callback"
      },
      function(token, tokenSecret, profile, done) {
        User.findOrCreate({ userId: profile.id }, function (err, user) {
          return done(err, user);
        });
      }
    ));

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'fellowshipone'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

    app.get('/auth/fellowshipone',
      passport.authenticate('fellowshipone'));
    
    app.get('/auth/fellowshipone/callback', 
      passport.authenticate('fellowshipone', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
      });

<!-- Coming soon!
## Examples

For a complete, working example, refer to the [login example](https://github.com/hairyhenderson/passport-fellowshipone/tree/master/examples/login).
-->

## Tests

    $ npm install --dev
    $ npm test

## Credits

  - [Jared Hanson](http://github.com/jaredhanson) - for [Passport](http://passportjs.org/) and for [passport-familysearch](https://github.com/jaredhanson/passport-familysearch) upon which this module was based.
  - [Dave Henderson](http://github.com/hairyhenderson) - for converting passport-familysearch to work with the [Fellowship One API](http://developer.fellowshipone.com/)


## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2014 Dave Henderson
