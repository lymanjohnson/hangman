const express = require('express');
const app = express();
const path = require('path');
const port = 3000;
const mustache = require('mustache-express');
const data = require('./data-player.json');
const data = require('./data-table.json');
const session = require('express-session');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const fs = require('fs');
const words = fs.readFileSync("/usr/share/dict/words", "utf-8").toLowerCase().split("\n");
let dataFile;


const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const mongoURL = 'mongodb://localhost:27017/hangman';


// app.use('/highscoretable', function (req, res) {
//   MongoClient.connect(mongoURL, function (err, db) {
//     const highscoretable = db.collection('highscoretable');
//     highscoretable.find({}).toArray(function (err, docs) {
//       res.render("index", {restaurants: docs})
//     })
//   })
// })




app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());

app.set('trust proxy', 1)
app.use(session({secret:'so-many-secrets',cookie:{maxAge:3600000,httpOnly:false}}));

app.engine('mustache', mustache());
app.set('views', './views')
app.set('view engine', 'mustache')

let maxLives = 7;  //this should be 7 under ordinary circumstances
let playMessage;
let minLength;
let maxLength;
let easyGameParams = {"min":3,"max":5}
let mediumGameParams = {"min":6,"max":8}
let hardGameParams = {"min":9,"max":100000000}

let debugCount = 0;

//will return a word between min and max length
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


//PICK UP HERE... this is how you open the data file...



// app.post("/", function (req, res) {
//   var addtolist = req.body.inputtodo; //Gets the text in the input tag with name ="inputtodo"
//   fs.readFile('data.json', 'utf8', function readFileCallback(err, data){
//       if (err){
//           console.log(err);
//       } else {
//       obj = JSON.parse(data); //now its an object
//       obj.todoArray.push(addtolist); //pushes the text to an array
//       json = JSON.stringify(obj); //converts back to json
//       fs.writeFile('data.json', json, 'utf8'); // writes to file
//   }});
//   res.redirect('/'); //reloads page
// });

//Will eventually update a high score table. Doesn't work yet.
function updateHighScoreTable(req,table) {
  insertNewScore(req,table);
  while (table.length > 10) {
    table.pop();
  }
}

// Will eventually insert a new score from req into a high score table. Doesn't work yet.
function insertNewScore(req,table) {
  newEntry = {};
  newEntry.player = req.sessionStore.player;
  newEntry.word = req.sessionStore.word;
  newEntry.score = req.sessionStore.score;
  for (i=0;i<table.length;i++){
    if (newEntry.score >= table[i].score){
      table.splice(i,0,newEntry)
      return
    }
  }
}

// Resets the game
function startOver(req){
  req.session.difficulty = req.body.difficulty; //stores current difficulty setting

  // Next three blocks pull min and max word length from difficult parameters and stores them in this session

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

  playMessage = "Good luck!"; // starting message
  let word = getNewWordLengthBetween(minLength,maxLength); // generates this session's word

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

// next few lines resets all the other game parameters to their start-of-game values
  req.session.word = word;
  req.session.lives = maxLives;
  req.session.score = word.length*maxLives; // score starts at max and counts down as you use up lives
  req.session.guesses = [];
  req.session.wordArray = [...word];
  req.session.visibleWord = [];
  for (i=0;i<word.length;i++){
    req.session.visibleWord.push(" ");
  }
}

// give up early
app.post('/resign',function(req,res){
  req.session.score = 0;
  req.session.won = false;
  req.session.lost = false;
  req.session.resigned = true;
  res.render('gameover',{playerData:req.session,playMessage:playMessage})
})

app.post('/login', function(req,res){
  req.session.player = req.body.player;
  res.render('welcome',{playerData:req.session,playMessage:playMessage})
})

app.post('/welcome', function(req,res){
  res.render('welcome',{playerData:req.session,playMessage:playMessage})
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
    req.session.won = true;
    req.session.lost = false;
    req.session.resigned = false;
    res.render('gameover',{playerData:req.session,playMessage:playMessage})
  }

  // If you've run out of lives, you've lost
  else if (req.session.lives <= 0) {
    // console.log("Third if");
    req.session.won = false;
    req.session.lost = true;
    req.session.resigned = false;
    res.render('gameover',{playerData:req.session,playMessage:playMessage})
  }

  // Otherwise, keep playing the game
  else {
    // console.log("Else");
  res.render('index',{playerData:req.session,playMessage:playMessage})
  }
})

// if player goes to a nonsense URL, bring them back to game
app.get('/:dynamic', function (req, res) {
  playMessage = "";
  res.redirect("/");
})

//
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

// not implemented yet, placeholder
app.post('/highscoretable', function(req,res) {
  res.render('highscoretable',{playerData:req.session,playMessage:playMessage})
})

// not implemented yet, placeholder
app.post('/playerhistory', function(req,res) {
  res.render('playerhistory',{playerData:req.session,playMessage:playMessage})
})

// Error handling for multiple guesses of the same letter
function isAlreadyGuessed(req){
  for (i=0;i<req.session.guesses.length;i++){ // checks the already-guessed letters

    if (req.body.letter == req.session.guesses[i]){ // "true" if new letter is already guessed, but wrong
      return true;
    }
  }

  for (i=0;i<req.session.visibleWord.length;i++){ // "true" if new letter is already guessed, and in word

    if (req.body.letter == req.session.visibleWord[i]){
      return true;
    }
  }

  // otherwise, it's a new letter, and returns "false"
  return false;
}

// checks to see if letter is in word
function isLetterCorrect(req){
  let found = false; // assumes it's not in the word
  for (i=0;i<req.session.wordArray.length;i++){  // cycles through the word
    if (req.session.wordArray[i] == req.body.letter){
      found = true; // if it ever finds that the letter IS in the word, it sets that the letter IS in the word
      req.session.visibleWord[i] = req.session.wordArray[i]; // also, it changes the current displayed letter from "-" to its identity
    }
  }
  return found;
}

app.post('/guess',function(req,res){

  if (isAlreadyGuessed(req)){
    playMessage = "You already guessed that";
  }

  else if (isLetterCorrect(req)) {  // isLetterCorrect() returns true/false, but it also updates the displayed letter. Its return value is being used as a conditional to change the playMessage here, but the body of that method also performs the act of updating the displayed word.
    playMessage = "Nice!";
  }

  // if it is not alreadyGuessed, and not correct, then it deducts a life and adds the wrong letter to the guessed list.
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


/////

// Completely unnecessary, but I was curious what the longest words in the dictionary were.
function findTheLongestWord(){
  let longestWordsThusFar = ["a"];
  for (i=0;i<words.length;i++){
    // console.log(i,":",words[i])
    if (words[i].length > longestWordsThusFar[0].length){
      // console.log("\n\n\n\n\n\nfound a longer word!",words[i],"\n\n\n\n\n");
      longestWordsThusFar = [words[i]];
    }
    else if (words[i].length == longestWordsThusFar[0].length) {
      // console.log("\n\n\n\n\n\n\nFound an equal word!",words[i],"\n\n\n");
      longestWordsThusFar.push(words[i]);
    }
  }
  return longestWordsThusFar;
}

// You can go navigate to /longestword if you're curious!
app.get('/longestword',function(req,res){
  let longestWords = findTheLongestWord();
  res.send(longestWords);
})
