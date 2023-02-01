const NORTH = "NORDEN";
const EAST = "OSTEN";
const SOUTH = "SÜDEN";
const WEST = "WESTEN";
const opposites = new Map([[NORTH, SOUTH], [EAST, WEST]]);
var directions = [];

//TODO: TESTEN!!!!!!

function optimizeList(){
    document.getElementById("optimalList").innerHTML = solve(directions);
}

// this function could also be called directly from within the application, but this way the format of the problem could be used (solve(parameter))
function solve(directionsList){
    if(directionsList.length > 1){
        // start with the second to last element
        var i = directionsList.length - 1;
        // traverse the array in reverse to make checking for bounds easier
        while(i--){
            console.log(directionsList);
            // get element and successor
            var currentDirection = directionsList[i];
            var nextDirection = directionsList[i + 1];
            if(checkForOpposite(currentDirection, nextDirection)){
                // remove both and set index to last eligible index
                directionsList.splice(i, 2);
                i++;
            }
        }
        return directionsList;
    }
    return "ERROR - directions can not be parsed!";
}

function checkForOpposite(currentDirection, nextDirection){
    // check for undefined values
    if(!currentDirection || !nextDirection){
        return false;
    }
    // refer to map for directions that cancel each other
    return opposites.get(currentDirection) === nextDirection || opposites.get(nextDirection) === currentDirection;
}

// called from the buttons
function addDirection(direction){
    directions.push(direction);
    console.log(directions);
    document.getElementById("baseList").innerHTML = directions;
}

// called onkeyup from the textarea
function parseToList(element){
    var text = element.value.toUpperCase();
    console.log(text);
    directions = text.split(",");
    document.getElementById("baseList").innerHTML = directions;
}