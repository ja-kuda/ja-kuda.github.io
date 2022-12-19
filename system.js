
function loadFiles(pageName){
    $.getJSON('jsons/' + pageName + 'Chapters.json', function( data ) {
        createChapters(data);
    });
}

function createChapters(chapters){

    var sideCheck = false;
    var lastTop = "";
    chapters.chapters.forEach(element => {

        var slashes = element.path.match(/\//g).length;
        
        const newDiv = document.createElement("div");
        newDiv.setAttribute("id", element.id);
        newDiv.setAttribute("path", element.path);
        newDiv.setAttribute("onClick", "showContent(this)");
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
            newDiv.setAttribute("onClick", "showSubs(this); showContent(this)");
            lastTop = element.id;
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
            newDiv.setAttribute("parent", lastTop);
            sideCheck = !sideCheck;
        } 
        const setter = document.getElementById("setter");
        setter.parentNode.insertBefore(newDiv, setter);
    });
    hideSubs();
    document.getElementById('Introduction').click();
}

function showContent(element){
    var menu = document.getElementById("menu");
    var allDivs = menu.getElementsByTagName("div");
    var array = Array.from(allDivs);
    array.forEach(div => {
        div.classList.remove("chapterClicked");
    });
    element.classList.add("chapterClicked");
    $.get(element.getAttribute("path") , function(data){
        document.getElementById("content").innerHTML = data;
    });
}

function showSubs(element){
    var menu = document.getElementById("menu");
    var allDivs = menu.getElementsByTagName("div");
    var array = Array.from(allDivs);
    array.forEach(div => {
        console.log(div.getAttribute("parent") + " , " + element.id);
        if(div.getAttribute("parent") == element.id || div.getAttribute("parent") == null || div.id == "searchField"){
            div.style.display = "block";
        }
        else{
            div.style.display = "none";
        }
    });
}

function hideSubs(){
    var menu = document.getElementById("menu");
    var allDivs = menu.getElementsByTagName("div");
    var array = Array.from(allDivs);
    array.forEach(div => {
        if(div.getAttribute("parent") != null){
            div.style.display = "none";
        }
    });
}

