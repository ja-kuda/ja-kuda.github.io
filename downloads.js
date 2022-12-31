
function showPreview(element){
    var menu = document.getElementById("menu");
    var allDivs = menu.getElementsByTagName("div");
    var array = Array.from(allDivs);
    array.forEach(div => {
        div.classList.remove("chapterClicked");
    });
    element.classList.add("chapterClicked");

    var preview = document.getElementById("previewFrame");
    preview.setAttribute("src", "https://ja-kuda.github.io/pdfs/" + element.id + ".pdf");
}