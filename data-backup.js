
users = [
  {"player":"lyman","password":"bowie","gameHistory":[
    {"word":"tiger","livesLeft":6,"score":30,"difficulty":"easy","result":"won"},
    {"word":"beat","livesLeft":3,"score":0,"difficulty":"easy","result":"forfeit"},
    {"word":"obstreperous","livesLeft":0,"score":0,"difficulty":"hard","result":"loss"}
    ]
  },
  {"player":"alucard","password":"dracula","gameHistory":[
    {"word":"castle","livesLeft":6,"score":36,"difficulty":"medium","result":"won"},
    {"word":"whip","livesLeft":3,"score":0,"difficulty":"easy","result":"forfeit"},
    {"word":"apocalypse","livesLeft":0,"score":0,"difficulty":"hard","result":"loss"}
    ]
  }
]

highScoreTable = [
  {"player":"Alucard","word":"Castle","score":36},
]

arr.splice(index, 0, item);

function updateHighScoreTable(req) {
  insertNewScore(req);
  while (highScoreTable.length) > 10 {
    highScoreTable.pop();
  }
}


function insertNewScore(req) {
  newEntry = {};
  newEntry.player = req.sessionStore.player;
  newEntry.word = req.sessionStore.word;
  newEntry.score = req.sessionStore.score;
  for (i=0;i<highScoreTable.length;i++){
    if (newEntry.score >= highScoreTable[i].score){
      highScoreTable.splice(i,0,{"Player:"})
      return
    }
  }
}


module.exports = {
  users:users,
  highScoreTable:highScoreTable,
  updateHighScoreTable:updateHighScoreTable,
  insertNewScore:insertNewScore // not sure if this needs to be exported...
}
