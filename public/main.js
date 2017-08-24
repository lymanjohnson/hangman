window.addEventListener("keypress", keyboardFunction, false);

let letterButtons = document.getElementsByTagName('button');

function keyboardFunction(event) {
  let thisKey = event.key.toLowerCase()
  console.log(thisKey);

  for (i=0;i<letterButtons.length;i++){
    // console.log("letterButtons[i].value",letterButtons[i].value);
    // console.log("letterButtons[i].name",letterButtons[i].name);
    // console.log("letterButtons[i].textContent",letterButtons[i].textContent);
    if (thisKey == letterButtons[i].value){
      letterButtons[i].click();
    }
  }
}
