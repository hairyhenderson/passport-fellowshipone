/**
 * Module dependencies.
 */
var util = require('util'),
   OAuthStrategy = require('passport-oauth').OAuthStrategy,
   InternalOAuthError = require('passport-oauth').InternalOAuthError,
   querystring = require('querystring'),
   URL = require('url'),
   request = require('request');

/**
 * `Strategy` constructor.
 *
 * The FellowshipOne authentication strategy authenticates requests by delegating
 * to Fellowship One using the OAuth 1.0a protocol.
 *
 * Applications must supply a `verify` callback which accepts a `token`,
 * `tokenSecret` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `churchCode`      Your Fellowship One church code
 *   - `staging`         Whether we're using staging or production
 *   - `consumerKey`     Fellowship One Developer Key
 *   - `consumerSecret`  Fellowship One Secret Key
 *   - `callbackURL`     URL to which Fellowship One will redirect the user after obtaining authorization
 *
 * Examples:
 *
 *     passport.use(new F1Strategy({
 *         churchCode: 'MYCHURCH',
 *         staging: true,
 *         consumerKey: '123',
 *         consumerSecret: 'xxx'
 *         callbackURL: 'https://www.example.net/auth/fellowshipone/callback'
 *       },
 *       function(token, tokenSecret, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */

function Strategy(options, verify) {
   options = options || {}
   options.churchCode = options.churchCode
   options.staging = options.staging || false
   options.apiURL = options.apiURL || (options.churchCode ? 'https://' + options.churchCode + (options.staging ? '.staging' : '') + '.fellowshiponeapi.com/v1' : '')
   options.requestTokenURL = options.requestTokenURL || options.apiURL + '/Tokens/RequestToken'
   options.accessTokenURL = options.accessTokenURL || options.apiURL + '/Tokens/AccessToken'
   options.userAuthorizationURL = options.userAuthorizationURL || options.apiURL + '/PortalUser/Login'

   OAuthStrategy.call(this, options, verify)
   this.options = options
   this.name = 'fellowshipone'

   // Override oauth.getOAuthAccessToken so that we can get the user profile from the
   // response headers.
   this._oauth.getOAuthAccessToken = function(oauth_token, oauth_token_secret, oauth_verifier, callback) {
      var extraParams = {};
      if (typeof oauth_verifier == "function") {
         callback = oauth_verifier;
      } else {
         extraParams.oauth_verifier = oauth_verifier;
      }

      this._performSecureRequest(oauth_token, oauth_token_secret, this._clientOptions.accessTokenHttpMethod, this._accessUrl, extraParams, null, null, function(error, data, response) {
         if (error) callback(error);
         else {
            var results = querystring.parse(data);
            var oauth_access_token = results["oauth_token"];
            delete results["oauth_token"];
            var oauth_access_token_secret = results["oauth_token_secret"];
            delete results["oauth_token_secret"];

            // this is the only customization really
            results.userURL = response.headers['content-location']

            callback(null, oauth_access_token, oauth_access_token_secret, results);
         }
      })
   }

   // Override oauth._performSecureRequest to account for https://github.com/ciaranj/node-oauth/issues/182
   this._oauth._performSecureRequest = function(oauth_token, oauth_token_secret, method, url, extra_params, post_body, post_content_type, callback) {
      var orderedParameters = this._prepareParameters(oauth_token, oauth_token_secret, method, url, extra_params);

      if (!post_content_type) {
         post_content_type = "application/x-www-form-urlencoded";
      }
      var parsedUrl = URL.parse(url, false);
      if (parsedUrl.protocol == "http:" && !parsedUrl.port) parsedUrl.port = 80;
      if (parsedUrl.protocol == "https:" && !parsedUrl.port) parsedUrl.port = 443;

      var headers = {};
      var authorization = this._buildAuthorizationHeaders(orderedParameters);
      if (this._isEcho) {
         headers["X-Verify-Credentials-Authorization"] = authorization;
      } else {
         headers["Authorization"] = authorization;
      }

      headers["Host"] = parsedUrl.host

      for (var key in this._headers) {
         if (this._headers.hasOwnProperty(key)) {
            headers[key] = this._headers[key];
         }
      }

      // Filter out any passed extra_params that are really to do with OAuth
      for (var key in extra_params) {
         if (this._isParameterNameAnOAuthParameter(key)) {
            delete extra_params[key];
         }
      }

      if ((method == "POST" || method == "PUT") && (post_body == null && extra_params != null)) {
         // Fix the mismatch between the output of querystring.stringify() and this._encodeData()
         post_body = querystring.stringify(extra_params)
            .replace(/\!/g, "%21")
            .replace(/\'/g, "%27")
            .replace(/\(/g, "%28")
            .replace(/\)/g, "%29")
            .replace(/\*/g, "%2A");
      }

      if (post_body) {
         if (Buffer.isBuffer(post_body)) {
            headers["Content-length"] = post_body.length;
         } else {
            headers["Content-length"] = Buffer.byteLength(post_body);
         }
         headers["Content-Type"] = post_content_type;
      } else {
         headers["Content-length"] = 0;
      }

      var path;
      if (!parsedUrl.pathname || parsedUrl.pathname == "") parsedUrl.pathname = "/";
      if (parsedUrl.query) path = parsedUrl.pathname + "?" + parsedUrl.query;
      else path = parsedUrl.pathname;

      var request;
      if (parsedUrl.protocol == "https:") {
         request = this._createClient(parsedUrl.port, parsedUrl.hostname, method, path, headers, true);
      } else {
         request = this._createClient(parsedUrl.port, parsedUrl.hostname, method, path, headers);
      }

      var clientOptions = this._clientOptions;
      if (callback) {
         var data = "";
         var self = this;

         // Some hosts *cough* google appear to close the connection early / send no content-length header
         // allow this behaviour.
         var allowEarlyClose = false; //OAuthUtils.isAnEarlyCloseHost(parsedUrl.hostname);
         var callbackCalled = false;
         var passBackControl = function(response) {
            if (!callbackCalled) {
               callbackCalled = true;
               if (response.statusCode >= 200 && response.statusCode <= 299) {
                  callback(null, data, response);
               } else {
                  // Follow 301 or 302 redirects with Location HTTP header
                  if ((response.statusCode == 301 || response.statusCode == 302) && clientOptions.followRedirects && response.headers && response.headers.location) {
                     self._performSecureRequest(oauth_token, oauth_token_secret, method, response.headers.location, extra_params, post_body, post_content_type, callback);
                  } else {
                     callback({
                        statusCode: response.statusCode,
                        data: data
                     }, data, response);
                  }
               }
            }
         }

         request.on('response', function(response) {
            response.setEncoding('utf8');
            response.on('data', function(chunk) {
               data += chunk;
            });
            response.on('end', function() {
               passBackControl(response);
            });
            response.on('close', function() {
               if (allowEarlyClose) {
                  passBackControl(response);
               }
            });
         });

         request.on("error", function(err) {
            if (!callbackCalled) {
               callbackCalled = true;
               callback(err)
            }
         });

         if ((method == "POST" || method == "PUT") && post_body != null && post_body != "") {
            request.write(post_body);
         }
         request.end();
      } else {
         if ((method == "POST" || method == "PUT") && post_body != null && post_body != "") {
            request.write(post_body);
         }
         return request;
      }

      return;
   }
}

/**
 * Inherit from `OAuthStrategy`.
 */
util.inherits(Strategy, OAuthStrategy);

/**
 * Implement this so that we can send the callback... This doesn't seem to be
 * working right for the oauth module...
 */
Strategy.prototype.userAuthorizationParams = function(options) {
   return {
      oauth_callback: this._callbackURL
   }
}

/**
 * Retrieve user profile from Fellowship One.
 *
 * This function constructs a normalized profile, with the following properties:
 *
 *   - `id`
 *   - `displayName`
 *   - `email`
 *
 * @param {String} token
 * @param {String} tokenSecret
 * @param {Object} params - this should have a userURL property, injected by the _oauth.getOAuthAccessToken call
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function(token, tokenSecret, params, done) {
   if (!params || !params.userURL) return done(null, {})

   var oauth = {
      consumer_key: this.options.consumerKey,
      consumer_secret: this.options.consumerSecret,
      token: token,
      token_secret: tokenSecret
   }

   request.get(params.userURL, {
      oauth: oauth,
      json: true
   }, (function(err, res, body) {
      if (err) {
         console.error(err)
         return done(new InternalOAuthError('failed to fetch user profile', err))
      }
      if (res.statusCode > 299) {
         var err = new InternalOAuthError('error ' + res.statusCode + ' while fetching user profile: ' + body)
         err.statusCode = res.statusCode
         console.error('failed to fetch user profile: %j', err)
         return done(err)
      }

      var user = body.person

      var profile = {}
      profile.id = Number(user['@id'])
      profile.uri = user['@uri']
      profile.displayName = user.goesByName ? user.goesByName : user.firstName
      profile.fullName = profile.displayName + ' ' + user.lastName

      // This sucks, but we have to get the e-mail address from a separate call (!)
      // this._oauth.get(params.userURL + '/Communications.json', token, tokenSecret, (function(err, body, res) {
      request.get(params.userURL + '/Communications', {
         oauth: oauth,
         json: true
      }, (function(err, res, body) {
         if (err) {
            console.error(err)
            return done(new InternalOAuthError('failed to fetch user email address', err))
         }

         var communication = body.communications.communication

         var emails = communication.reduce(function(memo, comm) {
            if (comm.communicationGeneralType === 'Email')
               memo.push({
                  value: comm.communicationValue,
                  type: comm.communicationType.name,
                  preferred: comm.preferred === "true"
               })
            return memo
         }, [])

         profile.email = emails.reduce(function(memo, email) {
            if (email.preferred) return email
            else if (memo) return memo
            else return email
         }, undefined).value

         done(null, profile)
      }).bind(this))
   }).bind(this))
}


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
