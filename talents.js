
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
    });
}


function filter(checkbox){
    allTalents.talents.forEach(element => {
        if(checkbox.id == element.name){
            const newDiv = document.createElement("div");
            const newContent = document.createTextNode(element);
            newDiv.appendChild(newContent);
            const currentDiv = document.getElementById("setter");
            document.body.insertBefore(newDiv, currentDiv);
        }
    });
}