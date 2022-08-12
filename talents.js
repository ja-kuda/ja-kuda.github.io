
var allTalents;
var checkBoxes;
var activeTags = [];

function loadFile(){
    // build tag checkboxes
    $.getJSON('tags.json', function( data ) {
        checkBoxes = data;
        createCheckboxes();
    });

    // read all talents
    $.getJSON('talents.json', function( data ) {
      allTalents = data;
      showAllTalents();
    });
}


function createCheckboxes(){
    checkBoxes.tags.forEach(element => {
        const cb = document.createElement("input");
        cb.setAttribute("type", "checkbox");
        cb.setAttribute("onClick", "filter(this)")
        cb.setAttribute("id", element);
        const newlabel = document.createElement("Label");
        newlabel.innerHTML = element;
        const br = document.createElement("br");
        const setter = document.getElementById("numberSetter");
        setter.parentNode.insertBefore(cb, setter);
        setter.parentNode.insertBefore(newlabel, setter);
        setter.parentNode.insertBefore(br, setter);
    });
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

function showAllTalents(){
    //allTalents.talents.sort(compare);

    allTalents.talents.forEach(element => {
        const newDiv = document.createElement("div");
        newDiv.setAttribute("id", element.name);
        newDiv.setAttribute("class", "talentBox");
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
    countTalents(allTalents.talents.length);
}


function countTalents(activeNumber){
    document.getElementById("numberSetter").innerHTML = "<br>" + activeNumber + " / " + allTalents.talents.length;
}


function filter(checkbox){
    var activeNumber = 0;
    if(checkbox.checked){
        activeTags.push(checkbox.id);
    }
    else{
        var index = activeTags.indexOf(checkbox.id);
        if (index > -1) {
            activeTags.splice(index, 1);
        }
    }
    console.log(activeTags);

    allTalents.talents.forEach(element => {
        var hasTag = true;

        if(activeTags.length === 0){
            hasTag = true;
        }
        else{
            activeTags.forEach(activeTag => {
                console.log(activeTag)
                if(!element.tags.includes(activeTag)){
                    hasTag = false;
                }
            })
        }
        if(hasTag){
            document.getElementById(element.name).style.display = 'block';
            activeNumber++;
        }
        else{
            document.getElementById(element.name).style.display = 'none';
        }
    });
    countTalents(activeNumber);
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