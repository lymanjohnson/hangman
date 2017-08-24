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

let maxLives = 8;  //this should track
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
  req.sessionStore.difficulty = req.body.difficulty; //stores current difficulty setting
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
  // console.log(word);
  req.sessionStore.word = word;
  req.sessionStore.lives = maxLives;
  req.sessionStore.score = word.length*maxLives;
  req.sessionStore.guesses = [];
  req.sessionStore.wordArray = [...word];
  req.sessionStore.visibleWord = [];
  for (i=0;i<word.length;i++){
    req.sessionStore.visibleWord.push("-");
  }
// console.log(req.sessionStore.word,req.sessionStore.lives,req.sessionStore.score);

}

app.get('/', function (req, res) {
  debugCount += 1;
  // If the word array is empty or non-existent, start a new game
  if (req.sessionStore.wordArray == [] || typeof req.sessionStore.wordArray === "undefined"){
    // console.log("First if");
    playMessage = "Welcome! A new game!!"
    // console.log(req.sessionStore.word,req.sessionStore.lives,req.sessionStore.score);
    res.render('index',{playerData:req.sessionStore,playMessage:playMessage})
  }

  // If the visible array is the same as the word array, you've won
  else if (arraysAreEqual(req.sessionStore.wordArray,req.sessionStore.visibleWord)){
    // console.log("Second if");
    res.render('win',{playerData:req.sessionStore,playMessage:playMessage})
  }

  // If you've run out of lives, you've lost
  else if (req.sessionStore.lives <= 0) {
    // console.log("Third if");
    res.render('lose',{playerData:req.sessionStore,playMessage:playMessage})
  }

  // Otherwise, keep playing the game
  else {
    // console.log("Else");
  res.render('index',{playerData:req.sessionStore,playMessage:playMessage})
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

function isAlreadyGuessed(req){
  for (i=0;i<req.sessionStore.guesses.length;i++){

    if (req.body.letter == req.sessionStore.guesses[i]){
      return true;
    }
  }

  for (i=0;i<req.sessionStore.visibleWord.length;i++){

    if (req.body.letter == req.sessionStore.visibleWord[i]){
      return true;
    }
  }

  return false;
}

function isLetterCorrect(req){
  let found = false;
  for (i=0;i<req.sessionStore.wordArray.length;i++){
    if (req.sessionStore.wordArray[i] == req.body.letter){
      found = true;
      req.sessionStore.visibleWord[i] = req.sessionStore.wordArray[i];
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
    req.sessionStore.guesses.push(req.body.letter);
    req.sessionStore.lives -= 1;
    req.sessionStore.score = req.sessionStore.word.length*req.sessionStore.lives;
    playMessage = "No match";

  }

  res.redirect("/");


})


app.listen(port, function () {
	  console.log('Successfully started express application!');
})
