
var allTalents;

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
        const newContent = document.createTextNode("Name: " + element.name + " - Effects: " + element.effects);
        newDiv.appendChild(newContent);
        const currentDiv = document.getElementById("setter");
        document.body.insertBefore(newDiv, currentDiv);
    });
}


function resetfilters(){

}


function filter(checkbox){
    // alle ohne tag unsichtbar machen
    if(checkbox.checked){

    }
    // alle ohne tag wieder sichtbar machen
    else{
        
    }
    allTalents.talents.forEach(element => {
        var hasTag = false;
        console.log(element.tags);
        element.tags.forEach(tag => {
            console.log(checkbox.id, tag);
            if(checkbox.id === tag){
                //DIV mit id = name von element sichtbar machen / andere unsichtbar machen
                hasTag = true;
            }
        });
        console.log(hasTag);
        if(!hasTag){
            document.getElementById(element.name).style.visibility = 'hidden';
        }
    });
}