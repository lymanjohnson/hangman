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

let word;
let lives;

function getNewWord(){
  newWord = words[Math.floor(Math.random()*words.length)];
  return newWord
}

function startOver(req){
  word = getNewWord();
  lives = 8;
  req.sessionStore.guesses = [];
  req.sessionStore.wordArray = [...word];
  req.sessionStore.visibleWord = [];
  for (i=0;i<word.length;i++){
    req.sessionStore.visibleWord.push("-");
  }
}

app.get('/', function (req, res) {
  res.render('index',{word:word,lives:lives,playerData:req.sessionStore})
})

app.get('/guess', function (req, res) {
  res.redirect("/");
})

app.post('/new', function(req,res) {
  startOver(req);
  res.redirect('/');
})

function isAlreadyGuessed(req){
  // console.log("isAlreadyGuessed called");
  // console.log("req.sessionStore.guesses",req.sessionStore.guesses);
  for (i=0;i<req.sessionStore.guesses.length;i++){
    // console.log("\ti:",i);
    // console.log("\treq.sessionStore.guesses[i]",req.sessionStore.guesses[i]);
    // console.log("\treq.body.letter",req.body.letter);
    // console.log("\treq.body.letter == req.sessionStore.guess[i]",req.body.letter == req.sessionStore.guesses[i]);

    if (req.body.letter == req.sessionStore.guesses[i]){
      // console.log("already guessed!");
      return true;
    }
  }
  // console.log("not already guessed!");
  return false;
}

function isLetterCorrect(req){
  let found = false;
  console.log("isLetterCorrect called");
  for (i=0;i<req.sessionStore.wordArray.length;i++){
    console.log(i);
    if (req.sessionStore.wordArray[i] == req.body.letter){
      found = true;
      console.log("true!");
      req.sessionStore.visibleWord[i] = req.sessionStore.wordArray[i];
    }
  }
  return found;
}

app.post('/guess',function(req,res){

  if (isAlreadyGuessed(req)){
    console.log("already guessed");
  }

  else if (isLetterCorrect(req)) {
    console.log("letter is correct");
    //turn over the correct letters
  }

  else {
    req.sessionStore.guesses.push(req.body.letter);
    lives -= 1;
    if (lives <= 0) {
      startOver(req);
    }

  }

  res.redirect("/");

  // console.log("guesses:",req.sessionStore.guesses);
  // console.log("visibleWord:",req.sessionStore.visibleWord);
  // console.log("wordArray:",req.sessionStore.wordArray);

})

app.listen(port, function () {
	  console.log('Successfully started express application!');
})
