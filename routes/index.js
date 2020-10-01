var express = require('express');
var router = express.Router();
const querystring = require('querystring');
const https = require('https');
var Promise = require('promise');
const { reject } = require('promise');
const { resolve } = require('path');
const { token } = require('morgan');

const CLIENT_ID = 'cb9abb4a-59b2-4675-9318-66c235b83c8e';
const CLIENT_SECRET = 'c44c21bb-0873-4030-9cee-5ab76c874470';
const SCOPES = 'crm.objects.marketing_events.read crm.objects.marketing_events.write contacts';
const REDIRECT_URI = 'http://localhost:5050/oauth-callback';

const authUrl =
  'https://app.hubspot.com/oauth/authorize' +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` + // app's client ID
  `&scope=${encodeURIComponent(SCOPES)}` + // scopes being requested by the app
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`; // where to send the user after the consent page


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Hubspot OAuth Sample', oauthUrl: authUrl });
});



/* GET oauth-callback */
router.get('/oauth-callback', function (req, res, next) {
  let code = req.query.code;
  const tokenFormData = {
    'grant_type': 'authorization_code',
    'client_id': CLIENT_ID,
    'client_secret': CLIENT_SECRET,
    'redirect_uri': REDIRECT_URI,
    'code': code
  };

  // generate token
  exchangeToken(tokenFormData).then((token) => {
    // load contacts data
    loadContacts(token).then((contacts) => {
      res.render('hubspot', { title: 'Hubspot API', contacts: contacts.results });
    });
  }).catch(err => {
    if (err == 'BAD_AUTH_CODE') {
      res.redirect(authUrl);
    }
  });
});


const exchangeToken = async (data) => {
  return new Promise(function (resolve, reject) {
    var postData = querystring.stringify(data);
    var options = {
      hostname: 'api.hubapi.com',
      port: 443,
      path: '/oauth/v1/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    var req = https.request(options, (res) => {
      var body = '';
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function () {
        const tokens = JSON.parse(body);
        if (tokens.status && tokens.status == 'BAD_AUTH_CODE') {
          reject('BAD_AUTH_CODE');
        } else {
          resolve({ AccessToken: tokens.access_token });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();

  });
}

const loadContacts = async (tokenResponse) => {
  console.log('token: ' + tokenResponse.AccessToken);
  return new Promise(function (resolve, reject) {
    var options = {
      host: 'api.hubapi.com',
      port: 443,
      path: '/crm/v3/objects/contacts?limit=10',
      headers: {
        'Authorization': `Bearer ${tokenResponse.AccessToken}`,
        'Content-Type': 'application/json'
      }
    };

    req = https.get(options, function (res) {
      var body = "";
      res.on('data', function (data) {
        body += data;
      });

      res.on('end', function () {
        resolve(JSON.parse(body));
      });

      res.on('error', function (e) {
        reject(e.message);
      });
    });
  });
}

module.exports = router;
