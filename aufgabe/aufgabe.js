const NORTH = "N";
const EAST = "O";
const SOUTH = "S";
const WEST = "W";
const opposites = new Map([[NORTH, SOUTH], [EAST, WEST]]);
var directions = [];
var optimalDirections = [];


function solve(){
    if(directions.length > 1){
        // start with the second to last element
        var i = directions.length - 1;
        // traverse the array in reverse to make checking for bounds easier
        while(i--){
            console.log(directions);
            // get element and successor
            var currentDirection = directions[i];
            var nextDirection = directions[i + 1];
            if(checkForOpposite(currentDirection, nextDirection)){
                // remove both and set index to last eligible index
                directions.splice(i, 2);
                i++;
            }
        }
        document.getElementById("optimalList").innerHTML = directions;
    }
}

function checkForOpposite(currentDirection, nextDirection){
    if(!currentDirection || !nextDirection){
        return false;
    }
    return opposites.get(currentDirection) === nextDirection || opposites.get(nextDirection) === currentDirection;
    /*if(currentDirection == NORTH && nextDirection == SOUTH){
        return true;
    }
    if(currentDirection == SOUTH && nextDirection == NORTH){
        return true;
    }
    if(currentDirection == WEST && nextDirection == EAST){
        return true;
    }
    if(currentDirection == EAST && nextDirection == WEST){
        return true;
    }
    return false;*/
}

function addDirection(direction){
    directions.push(direction);
    console.log(directions);
    document.getElementById("baseList").innerHTML = directions;
}

function parseToList(element){
    var text = element.value;
    console.log(text);
    directions = text.split(",");
    document.getElementById("baseList").innerHTML = directions;
}