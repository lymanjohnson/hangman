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
  req.sessionStore.word = word;
  req.sessionStore.lives = maxLives;
  req.sessionStore.score = word*maxLives;
  req.sessionStore.guesses = [];
  req.sessionStore.wordArray = [...word];
  req.sessionStore.visibleWord = [];
  for (i=0;i<word.length;i++){
    req.sessionStore.visibleWord.push("-");
  }
}

app.get('/', function (req, res) {
  debugCount += 1;
  // //console.log("Hit '/' for the",debugCount+"th time.");
  // //console.log("\t Lives:",lives);
  // //console.log("\t Word:",word);
  // //console.log("\t wordArray:",req.sessionStore.wordArray);
  // //console.log("\t visibleWord:",req.sessionStore.visibleWord);
  // //console.log("\t guesses:",req.sessionStore.guesses);
  // //console.log("First if: req.sessionStore.wordArray == [] || typeof req.sessionStore.wordArray === 'undefined'",req.sessionStore.wordArray == [] || typeof req.sessionStore.wordArray === 'undefined');
  // //console.log("Second if: arraysAreEqual(req.sessionStore.wordArray,req.sessionStore.visibleWord):",arraysAreEqual(req.sessionStore.wordArray,req.sessionStore.visibleWord));
  // //console.log("Third if: lives <= 0",lives <= 0);
  // If the word array is empty or non-existent, start a new game
  if (req.sessionStore.wordArray == [] || typeof req.sessionStore.wordArray === "undefined"){
    // //console.log("First if");
    playMessage = "Welcome! A new game!!"
    res.render('index',{playerData:req.sessionStore,playMessage:playMessage})
  }

  // If the visible array is the same as the word array, you've won
  else if (arraysAreEqual(req.sessionStore.wordArray,req.sessionStore.visibleWord)){
    // //console.log("Second if");
    res.render('win',{playerData:req.sessionStore,playMessage:playMessage})
  }

  // If you've run out of lives, you've lost
  else if (lives <= 0) {
    // //console.log("Third if");
    res.render('lose',{playerData:req.sessionStore,playMessage:playMessage})
  }

  // Otherwise, keep playing the game
  else {
    // //console.log("Else");
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
  // //console.log("isAlreadyGuessed called");
  // //console.log("req.sessionStore.guesses",req.sessionStore.guesses);
  for (i=0;i<req.sessionStore.guesses.length;i++){
    // //console.log("\ti:",i);
    // //console.log("\treq.sessionStore.guesses[i]",req.sessionStore.guesses[i]);
    // //console.log("\treq.body.letter",req.body.letter);
    // //console.log("\treq.body.letter == req.sessionStore.guess[i]",req.body.letter == req.sessionStore.guesses[i]);

    if (req.body.letter == req.sessionStore.guesses[i]){
      // //console.log("already guessed!");
      return true;
    }
  }

  for (i=0;i<req.sessionStore.visibleWord.length;i++){
    // //console.log("\ti:",i);
    // //console.log("\treq.sessionStore.guesses[i]",req.sessionStore.guesses[i]);
    // //console.log("\treq.body.letter",req.body.letter);
    // //console.log("\treq.body.letter == req.sessionStore.guess[i]",req.body.letter == req.sessionStore.guesses[i]);

    if (req.body.letter == req.sessionStore.visibleWord[i]){
      // //console.log("already guessed!");
      return true;
    }
  }

  // //console.log("not already guessed!");
  return false;
}

function isLetterCorrect(req){
  let found = false;
  // //console.log("isLetterCorrect called");
  for (i=0;i<req.sessionStore.wordArray.length;i++){
    // //console.log(i);
    if (req.sessionStore.wordArray[i] == req.body.letter){
      found = true;
      // //console.log("true!");
      req.sessionStore.visibleWord[i] = req.sessionStore.wordArray[i];
    }
  }
  return found;
}

app.post('/guess',function(req,res){

  if (isAlreadyGuessed(req)){
    // //console.log("already guessed");
    playMessage = "You already guessed that";
  }

  else if (isLetterCorrect(req)) {
    // //console.log("letter is correct");
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

  // //console.log("guesses:",req.sessionStore.guesses);
  // //console.log("visibleWord:",req.sessionStore.visibleWord);
  // //console.log("wordArray:",req.sessionStore.wordArray);

})

// app.get("/win",function(req,res){
//   if (req.sessionStore.wordArray == req.sessionStore.visibleWord){
//     res.render('win',{word:word,lives:lives,playerData:req.sessionStore,playMessage:playMessage})
//   }
//   else {
//     playMessage = "Cheater! That cost you a turn."
//     lives -= 1;
//     res.redirect("/")
//   }
// })
//
// app.get("/lose",function(req,res){
//   if(lives <= 0){
//     playMessage = "Good effort!"
//   }
//   else {
//     playMessage = "Why did you give up? You still had lives left."
//   }
//   res.render('lose',{word:word,lives:lives,playerData:req.sessionStore,playMessage:playMessage})
// })

app.listen(port, function () {
	  //console.log('Successfully started express application!');
})
