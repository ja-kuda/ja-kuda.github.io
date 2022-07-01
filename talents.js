
var allTalents;
var activeTags = [];

function loadFile(){
    $.getJSON('https://ja-kuda.github.io/talents.json', function( data ) {
      console.log(data.talents[0]);
      console.log(data.talents.length);

      data.talents.forEach(element => {
        console.log(element.name);
        console.log(element.prerequisites);
        console.log(element.charges);
        console.log(element.costs);
        console.log(element.effects);
        console.log(element.tags);
      });
      allTalents = data;
      showAllTalents();
    });
}


function showAllTalents(){
    allTalents.talents.forEach(element => {
        const newDiv = document.createElement("div");
        newDiv.setAttribute("id", element.name);
        const newContent = document.createTextNode(element.name + " - " + element.effects);
        newDiv.appendChild(newContent);
        const currentDiv = document.getElementById("setter");
        document.body.insertBefore(newDiv, currentDiv);
    });
}


function resetfilters(){

}


function filter(checkbox){
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
        var hasTag = false;
        element.tags.forEach(tag => {
            if(activeTags.includes(tag)){
                hasTag = true;
            }
        });
        if(!hasTag){
            document.getElementById(element.name).style.visibility = 'hidden';
        }
        else{
            document.getElementById(element.name).style.visibility = 'visible';
        }
    });
}