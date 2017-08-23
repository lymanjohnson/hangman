const express = require('express');
const app = express();
const path = require('path');
const port = 3000;
const mustache = require('mustache-express');
const data = require('./data.js');
const session = require('express-session');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const fs = require('fs');
const words = fs.readFileSync("/usr/share/dict/words", "utf-8").toLowerCase().split("\n");

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());

app.set('trust proxy', 1)
app.use(session({secret:'so-many-secrets',cookie:{maxAge:3600000,httpOnly:false}}));

app.engine('mustache', mustache());
app.set('views', './views')
app.set('view engine', 'mustache')

let word = getNewWord()
let lives = 8;

function getNewWord(){
  let newWord = "hi";
  newWord = words[Math.floor(Math.random()*words.length)];
  return newWord
}

app.get('/', function (req, res) {
  res.render('index',{word:word,lives:lives})
})

app.get('/guess', function (req, res) {
  res.redirect("/");
})

app.post('/new', function(req,res) {
  word = getNewWord();
  lives = 8;
  res.redirect('/');
})

app.post('/guess',function(req,res){
  console.log(req.body.letter);
})

app.listen(port, function () {
	  console.log('Successfully started express application!');
})
