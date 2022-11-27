
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

    doc.getElementById("Orte").addEventListener("click", elementClicked);
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
  }



