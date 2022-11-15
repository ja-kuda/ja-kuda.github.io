
var allTalents;
var activeTalents = [];
var activeTags = [];

function loadFile(){
    // build tag checkboxes
    $.getJSON('tags.json', function( data ) {
        createCheckboxes(data);
    });

    // read all talents
    $.getJSON('talents.json', function( data ) {
      allTalents = data;
      showActiveTalents(allTalents.talents);
    });
}

function createCheckboxes(checkBoxes){
    var inCheck = 0;
    var sideCheck = false;

    checkBoxes.tags.forEach(element => {
        const newDiv = document.createElement("div");
        newDiv.setAttribute("id", element);

        if(inCheck <= 1){
            newDiv.setAttribute("class", "filterBox1");
        }
        if(inCheck >= 2){
            newDiv.setAttribute("class", "filterBox2");
        }

        newDiv.setAttribute("onClick", "filter(this)");

        const newlabel = document.createElement("Label");
        newlabel.setAttribute("for", element);
        newlabel.innerHTML = element;
        newDiv.appendChild(newlabel);
        const br = document.createElement("br");

        if(sideCheck){
            const setter = document.getElementById("filterSetterRight");
            setter.parentNode.insertBefore(newDiv, setter);
        }
        else{
            const setter = document.getElementById("filterSetterLeft");
            setter.parentNode.insertBefore(newDiv, setter);
        }
        
        sideCheck = !sideCheck;
        inCheck++;
        if(inCheck == 4){
            inCheck = 0;
        }
    });
}


function filter(checkBox){

    if(checkBox.classList.contains("filterBox1")){
        checkBox.classList.replace("filterBox1", "filterBox1Clicked");
        activeTags.push(checkBox.id);
    }
    else if(checkBox.classList.contains("filterBox1Clicked")){
        checkBox.classList.replace("filterBox1Clicked", "filterBox1");
        var index = activeTags.indexOf(checkBox.id);
        if (index > -1) {
            activeTags.splice(index, 1);
        }
    }
    if(checkBox.classList.contains("filterBox2")){
        checkBox.classList.replace("filterBox2", "filterBox2Clicked");
        activeTags.push(checkBox.id);
    }
    else if(checkBox.classList.contains("filterBox2Clicked")){
        checkBox.classList.replace("filterBox2Clicked", "filterBox2");
        var index = activeTags.indexOf(checkBox.id);
        if (index > -1) {
            activeTags.splice(index, 1);
        }
    }
    activeTalents = [];

    allTalents.talents.forEach(element => {
        var elementHasAllTags = true;
        activeTags.forEach(tag => {
            if(!element.tags.includes(tag)){
                elementHasAllTags = false;
            }
        });
        if(elementHasAllTags){
            activeTalents.push(element);
        }
        if(document.getElementById(element.name) != null){
            document.getElementById(element.name).remove();
        }
        
    });
    showActiveTalents(activeTalents);
}


function compare( a, b ) {
    if ( a.name < b.name ){
      return -1;
    }
    if ( a.name > b.name ){
      return 1;
    }
    return 0;
  }

  function showActiveTalents(activeTalents){
    activeTalents.sort(compare);
    var inCheck = false;

    activeTalents.forEach(element => {
        const newDiv = document.createElement("div");
        newDiv.setAttribute("id", element.name);

        if(inCheck){
            newDiv.setAttribute("class", "talentBox1");
        }
        else{
            newDiv.setAttribute("class", "talentBox2");
        }
        inCheck = !inCheck;
        
        const br = document.createElement("br");
        const name = document.createTextNode("Name: " + element.name);
        newDiv.appendChild(name);
        newDiv.appendChild(br);
        const prereq = document.createTextNode("Prerequisites: " + element.prerequisites);
        newDiv.appendChild(prereq);
        newDiv.appendChild(br.cloneNode());
        const charges = document.createTextNode("Charges: " + element.charges);
        newDiv.appendChild(charges);
        newDiv.appendChild(br.cloneNode());
        const costs = document.createTextNode("Costs: " + element.costs);
        newDiv.appendChild(costs);
        newDiv.appendChild(br.cloneNode());
        const effects = document.createTextNode("Effects: " + element.effects);
        newDiv.appendChild(effects);
        const currentDiv = document.getElementById("setter");
        currentDiv.parentNode.insertBefore(newDiv, currentDiv);
    });
    countTalents(activeTalents.length);
}

function countTalents(activeNumber){
    document.getElementById("numberSetter").innerHTML = activeNumber + " / " + allTalents.talents.length;
}

function search(){
    var searchTerm = document.getElementById("searchField").value.toUpperCase();


    activeTalents = [];

    allTalents.talents.forEach(element => {
        var elementHasAllTags = true;
        activeTags.forEach(tag => {
            if(!element.tags.includes(tag)){
                elementHasAllTags = false;
            }
        });
        if(elementHasAllTags && (element.effects.toUpperCase().includes(searchTerm) || element.name.toUpperCase().includes(searchTerm) || element.prerequisites.toUpperCase().includes(searchTerm))){
            activeTalents.push(element);
        }
        if(document.getElementById(element.name) != null){
            document.getElementById(element.name).remove();
        }
    });
    showActiveTalents(activeTalents);
}












function rollDice(){
    var numberOfDice = 6;
    var valueOfDice = 10;
    var tries = 1000000;
    var result = 0;

    for(let i = 0; i < tries; i++){
        var roundMax = 0;
        for(let j = 0; j < numberOfDice; j++){
            var tmp = 1 + Math.floor(Math.random() * valueOfDice);
            tmp = checkMax(tmp, valueOfDice);
            if(tmp >= roundMax){
                roundMax = tmp;
            }
        }
        result += roundMax;
    }
    //console.log(result);
    console.log(result / tries);
}

function checkMax(value, diceValue){
    var returnValue = value;
    if((returnValue % diceValue) == 0){
        returnValue += 1 + Math.floor(Math.random() * diceValue);
        checkMax(returnValue, diceValue);
    }
    else{
        return returnValue;
    }
    return returnValue;
}