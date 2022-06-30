
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
        const newContent = document.createTextNode("Name: " + element.name);
        newDiv.appendChild(newContent);
        const currentDiv = document.getElementById("setter");
        document.body.insertBefore(newDiv, currentDiv);
    });
}


function resetfilters(){

}


function filter(checkbox){
    allTalents.talents.forEach(element => {
        var hasTag = true;
        element.tags.forEach(tag => {
            if(checkbox.id != tag && checkbox.checked == true){
                //DIV mit id = name von element sichtbar machen / andere unsichtbar machen
                hasTag = false;
            }
        });
        if(!hasTag){
            document.getElementById(element.name).style.visibility = 'hidden';
        }
    });
}