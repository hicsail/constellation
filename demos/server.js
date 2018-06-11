const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');

const constellation = require('../lib/constellation');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('json spaces', 1);

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.static(__dirname + '/static'));
app.use(express.static(__dirname + '/static/css'));
app.use(express.static(__dirname + '/static/js'));
app.use(express.static(__dirname + '/../lib'));

const server = app.listen(8082, function () {
  console.log('Listening on port %d', server.address().port);
  console.log('http://localhost:8082/');
});

app.get('/', function(req,res) {
  res.sendFile((path.join(__dirname + '/static/client.html')));
});

app.post('/postSpecs', function(req,res) {
  let langText = req.body.specification;
  let categories = req.body.categories;
  console.log('Received new specification', langText, categories);

  try {
    langText = langText.trim();
    categories = JSON.parse(categories);
  } catch (e) {
    res.status(500).send('Input improperly formed');
  }

  const designObj = constellation(langText, categories, 40);

  res.send(designObj);
});
