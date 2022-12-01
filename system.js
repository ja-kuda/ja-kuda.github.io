
function loadFiles(){
    $.getJSON('jsons/systemChapters.json', function( data ) {
        createChapters(data);
    });
}

function createChapters(chapters){

    var sideCheck = false;
    chapters.chapters.forEach(element => {
        console.log(element.id);

        var slashes = element.path.match(/\//g).length;
        
        const newDiv = document.createElement("div");
        newDiv.setAttribute("id", element.id);
        newDiv.setAttribute("path", element.path);
        newDiv.setAttribute("onClick", "showSubs(this)");
        const newlabel = document.createElement("Label");
        newDiv.setAttribute("style", "cursor: pointer");
        newlabel.setAttribute("style", "cursor: pointer");
        newlabel.setAttribute("for", element.id);
        newlabel.setAttribute("class", "label");
        newlabel.innerHTML = element.id;
        newDiv.appendChild(newlabel);
        const br = document.createElement("br");

        if(slashes == 2){
            // Top
            newDiv.setAttribute("class", "chapter");
            sideCheck = false;
        }
        else{
            // Sub
            if(sideCheck){
                newDiv.setAttribute("class", "chapterLeft");
            }
            else{
                newDiv.setAttribute("class", "chapterRight");
            }
            sideCheck = !sideCheck;
        } 
        const setter = document.getElementById("setter");
        setter.parentNode.insertBefore(newDiv, setter);
    });
}

function showSubs(element){
    element.classList.toggle("chapterClicked");
    $.get(element.getAttribute("path") , function(data){
        document.getElementById("content").innerHTML = data;
      });
}