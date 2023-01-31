
var modal = document.getElementById("contentBackdrop");

function toggleLayer(button, layer) {

  button.classList.toggle("button_notactive");
  button.classList.toggle("button_active");

  var x = document.getElementById("pnp-map").contentDocument.getElementById(layer);

  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}

function toggleLanguage(button){
  var doc = document.getElementById("pnp-map").contentDocument;

  if(button.innerHTML == "Deutsch"){
    button.innerHTML = "English";
    doc.getElementById("GeoGerman").style.display = "none";
    doc.getElementById("GeoEnglish").style.display = "block";
  }
  else if(button.innerHTML == "English"){
    button.innerHTML = "Deutsch";
    doc.getElementById("GeoEnglish").style.display = "none";
    doc.getElementById("GeoGerman").style.display = "block";
  }
}

function zoom() {
  window.pnpMap.zoomIn()
}

function unzoom() {
  window.pnpMap.zoomOut()
}

  window.onload = function() {

    var map = document.getElementById("pnp-map");
    var doc = map.contentDocument;

    doc.getElementById("Raster").style.display = "none";
    doc.getElementById("Regionen").style.display = "none";
    doc.getElementById("Provinz_Wappen").style.display = "none";
    doc.getElementById("GeoGerman").style.display = "none";

    doc.getElementById("LocationButtons").addEventListener("click", elementClicked);
    doc.getElementById("LocationButtons").addEventListener("mouseenter", locationHovered);
    
    doc.getElementById("Regionen").addEventListener("click", regionClicked);

    Array.from(doc.getElementById("Regionen").children).forEach(element => {
      element.addEventListener("mouseenter", elementHovered);
      element.addEventListener("mouseout", elementHoveredEnd);
    });
    //doc.getElementById("Orte").addEventListener("click", () => console.log("clicked"));

    var eventsHandler = {
      haltEventListeners: ['touchstart', 'touchend', 'touchmove', 'touchleave', 'touchcancel']
    , init: function(options) {
        var instance = options.instance
          , initialScale = 1
          , pannedX = 0
          , pannedY = 0

        // Init Hammer
        // Listen only for pointer and touch events
        this.hammer = Hammer(options.svgElement, {
          inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput
        })

        // Enable pinch
        this.hammer.get('pinch').set({enable: true})

        // Handle double tap
        this.hammer.on('doubletap', function(ev){
          instance.zoomIn()
        })

        // Handle pan
        this.hammer.on('panstart panmove', function(ev){
          // On pan start reset panned variables
          if (ev.type === 'panstart') {
            pannedX = 0
            pannedY = 0
          }

          // Pan only the difference
          instance.panBy({x: ev.deltaX - pannedX, y: ev.deltaY - pannedY})
          pannedX = ev.deltaX
          pannedY = ev.deltaY
        })

        // Handle pinch
        this.hammer.on('pinchstart pinchmove', function(ev){
          // On pinch start remember initial zoom
          if (ev.type === 'pinchstart') {
            initialScale = instance.getZoom()
            instance.zoomAtPoint(initialScale * ev.scale, {x: ev.center.x, y: ev.center.y})
          }
          instance.zoomAtPoint(initialScale * ev.scale, {x: ev.center.x, y: ev.center.y})
        })

        // Prevent moving the page on some devices when panning over SVG
        options.svgElement.addEventListener('touchmove', function(e){ e.preventDefault(); });
      }

    , destroy: function(){
        this.hammer.destroy()
      }
    }
    // Expose to window namespase for testing purposes
    window.pnpMap = svgPanZoom('#pnp-map', {
      zoomEnabled: true,
      fit: true,
      center: true,
      maxZoom: 1000,
      customEventsHandler: eventsHandler,
      mouseWheelZoomEnabled: true,
      zoomScaleSensitivity: 0.3
    });
  }

  function elementClicked(event){
    console.log(event.target.id);
    $.get('./map_locations/locations/' + event.target.id + '/index.html', function(data){
      document.getElementById("content").innerHTML = data;
    });
    
    document.getElementById("contentBackdrop").style.display = "block";
  }

  function regionClicked(event){
    console.log(event.target);
    var region = event.target.id;
    console.log(region);
    $.get('map_locations/regions/' + region + '.html', function(data){
      document.getElementById("content").innerHTML = data;
    });
    
    document.getElementById("contentBackdrop").style.display = "block";
  }

  function elementHovered(event){
    event.target.style.stroke = "#ffffff";
    event.target.style.strokeWidth = "7";
    event.target.style.opacity = "100%";
    event.target.style.strokeOpacity = "100%";
    event.target.style.fillOpacity = "35%";
    event.target.z
    //event.target.setAttribute("fill-opacity", "0.01");
  }

  function elementHoveredEnd(event){
    event.target.style.stroke = "none";
    //event.target.style.fill = "white";
    //event.target.style.opacity = "1%";
  }

  window.onclick = function(event) {
    console.log(event.target);
    if (event.target == document.getElementById("contentBackdrop")) {
      modal.style.display = "none";
    }
  }

  function locationHovered(event){
    console.log(event.target + " ENTER");
    event.target.style.cursor = "pointer";
    event.target.setAttribute("cursor", "pointer");
    console.log(event.target.style.cursor);
  }







