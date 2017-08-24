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

let maxLives = 2;  //this should be 8 under ordinary circumstances
let playMessage;
let minLength;
let maxLength;
let easyGameParams = {"min":3,"max":5}
let mediumGameParams = {"min":6,"max":8}
let hardGameParams = {"min":9,"max":100000000}

let debugCount = 0;

function getNewWordLengthBetween(min,max){
  newWord = words[Math.floor(Math.random()*words.length)]; // seed a word
  // As long as it's between min and max, keep generating new words
  while (newWord.length < min || newWord.length > max) {
    newWord = words[Math.floor(Math.random()*words.length)];
  }
  return newWord;
}

//accepts two equal-lengthed arrays and compares their contents, returning true if they are the same
function arraysAreEqual(a,b){
  if (typeof a == "undefined" || typeof b == "undefined") {
    return false;
  }

  for (i=0;i<a.length;i++){
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}

function startOver(req){
  req.session.difficulty = req.body.difficulty; //stores current difficulty setting
  if (req.body.difficulty == "easy") {
    minLength = easyGameParams.min;
    maxLength = easyGameParams.max;
  }

  else if (req.body.difficulty == "hard") {
    minLength = hardGameParams.min;
    maxLength = hardGameParams.max;
  }

  else {
    minLength = mediumGameParams.min;
    maxLength = mediumGameParams.max;
  }

  playMessage = "Good luck!";
  let word = getNewWordLengthBetween(minLength,maxLength);

  console.log("req.body.player",req.body.player);
  console.log(typeof req.body.player);

  //checks to see if no new player name was entered
  if (typeof req.body.player == "undefined" || req.body.player == "") {

    //then it checks to see if there was already a player name
    if (typeof req.session.player == "undefined" || req.session.player == ""){
      //if not, it calls you "New Challenger"
      req.session.player = "New Challenger";
    }
    //otherwise you must have already entered a name
    else {
      //in which case we just keep it (we probably don't need this else line at all)
      req.session.player = req.session.player;
    }
  }

  //this triggers if a new player name was entered
  else {
    req.session.player = req.body.player;

  }

  req.session.word = word;
  req.session.lives = maxLives;
  req.session.score = word.length*maxLives;
  req.session.guesses = [];
  req.session.wordArray = [...word];
  req.session.visibleWord = [];
  for (i=0;i<word.length;i++){
    req.session.visibleWord.push("-");
  }
}

app.post('/login', function(req,res){
  req.session.player = req.body.player;
  res.redirect('/welcome')
})

app.get('/', function (req, res) {
  debugCount += 1;
  // If the word array is empty or non-existent, start a new game
  if (req.session.wordArray == [] || typeof req.session.wordArray === "undefined"){
    // console.log("First if");
    playMessage = "Welcome! A new game!!"
    // console.log(req.session.word,req.session.lives,req.session.score);
    res.render('welcome',{playerData:req.session,playMessage:playMessage})
  }

  // If the visible array is the same as the word array, you've won
  else if (arraysAreEqual(req.session.wordArray,req.session.visibleWord)){
    // console.log("Second if");
    res.render('win',{playerData:req.session,playMessage:playMessage})
  }

  // If you've run out of lives, you've lost
  else if (req.session.lives <= 0) {
    // console.log("Third if");
    res.render('lose',{playerData:req.session,playMessage:playMessage})
  }

  // Otherwise, keep playing the game
  else {
    // console.log("Else");
  res.render('index',{playerData:req.session,playMessage:playMessage})
  }
})

app.get('/:dynamic', function (req, res) {
  playMessage = "";
  res.redirect("/");
})

app.post('/new', function(req,res) {
  startOver(req);
  res.redirect('/');
})

app.post('/logout', function(req,res) {
  console.log("got to /logout");
  console.log("req.session:",req.session);
  req.session.destroy();
  console.log("destroyed!");
  console.log("req.session:",req.session);
  res.redirect('/');
})

app.post('/highscoretable', function(req,res) {
  res.render('highscoretable',{playerData:req.session,playMessage:playMessage})
})

app.post('/playerhistory', function(req,res) {
  res.render('playerhistory',{playerData:req.session,playMessage:playMessage})
})


function isAlreadyGuessed(req){
  for (i=0;i<req.session.guesses.length;i++){

    if (req.body.letter == req.session.guesses[i]){
      return true;
    }
  }

  for (i=0;i<req.session.visibleWord.length;i++){

    if (req.body.letter == req.session.visibleWord[i]){
      return true;
    }
  }

  return false;
}

function isLetterCorrect(req){
  let found = false;
  for (i=0;i<req.session.wordArray.length;i++){
    if (req.session.wordArray[i] == req.body.letter){
      found = true;
      req.session.visibleWord[i] = req.session.wordArray[i];
    }
  }
  return found;
}

app.post('/guess',function(req,res){

  if (isAlreadyGuessed(req)){
    playMessage = "You already guessed that";
  }

  else if (isLetterCorrect(req)) {
    playMessage = "Nice!";
    //turn over the correct letters
  }

  else {
    req.session.guesses.push(req.body.letter);
    req.session.lives -= 1;
    req.session.score = req.session.word.length*req.session.lives;
    playMessage = "No match";

  }

  res.redirect("/");


})


app.listen(port, function () {
	  console.log('Successfully started express application!');
})
