"use strict";


var TILE_WIDTH = 200
var Direction = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
    getAdjacentCoords: function(x, y, dir) {
        var adjX = x,
            adjY = y;

        switch (dir) {
            case Direction.NORTH:
                --adjY;
                break;

            case Direction.EAST:
                ++adjX;
                break;

            case Direction.SOUTH:
                ++adjY;
                break;

            case Direction.WEST:
                --adjX;
                break;

            default:
                throw new Error(direction + " is not a direction.");
        }

        return {"x": adjX, "y": adjY};
    },
    getLeft: function(direction) {
        --direction;
        if (direction < 0) {
            direction = 3;
        }

        return direction;
    },
    getRight: function(direction) {
        ++direction;
        if (direction > 3) {
            direction = 0;
        }

        return direction;
    },
    getBack: function(direction) {
        direction -= 2;

        if (direction < 0) {
            direction += 4;
        }

        return direction;
    }
};

var game = {
    dungeon: null,
    walls: null,
    player: null,
    monsters: null
};

var canvas,
    wKey = false,
    aKey = false,
    sKey = false,
    dKey = false;

$(function(){
    window.onkeydown = keyDown;
    window.onkeyup = keyUp;
    $("#playButton").click(function() {
        $(this).prop("disabled", true);
        $.post("/game", initGame);
    });
});


function keyDown(e) {
    switch (e.keyCode) {
        case 87:
            wKey = true;
            break;
        case 83:
            sKey = true;
            break;
        case 65:
            aKey = true;
            break;
        case 68:
            dKey = true;
            break;
    }
}

function keyUp(e) {
    switch (e.keyCode) {
        case 87:
            wKey = false;
            break;
        case 83:
            sKey = false;
            break;
        case 65:
            aKey = false;
            break;
        case 68:
            dKey = false;
            break;
    }
}


function collides(obj1, obj2) {
    // These two lines fix a bug with fabric.Rect that causes
    // intersectsWithObject to return a false negative.
    obj1.g.setCoords();
    obj2.g.setCoords();

    return obj1.g.intersectsWithObject(obj2.g);
}


function containsCreature(tile, creature) {
    var bounds = {
        left: tile.x - TILE_WIDTH/2,
        top: tile.y - TILE_WIDTH/2,
        right: tile.x + TILE_WIDTH/2,
        bottom: tile.y + TILE_WIDTH/2
    };

    return creature.x > bounds.left && creature.x < bounds.right && creature.y > bounds.top && creature.y < bounds.bottom;
}


/*******************************************************************************
INTIALIZATION FUNCTIONS
*******************************************************************************/
/**
* Once the server has sent the map information, set up the game and play!
*/
function initGame(mapData, status) {
    // Set up the canvas.
    var $element = $("<canvas></canvas>")
        .attr("id", "canvas")
        .attr("width", 800)
        .attr("height", 600);

    $("#content").empty().append($element);

    // Set up the map.
    initMap(mapData);
    initGraphics();

    setInterval(gameLoop, 10);
}


function initMap(mapData) {
    game.walls = [];
    game.dungeon = [];
    game.monsters = [];
    for (var x = 0; x < mapData.length; ++x) {
        game.dungeon[x] = [];
        for (var y = 0; y < mapData[0].length; ++y) {
            var tile;
            switch (mapData[x][y]) {
                case 0:
                    tile = new Floor(x*TILE_WIDTH, y*TILE_WIDTH);
                    break;
                case 1:
                    tile = new Wall(x*TILE_WIDTH, y*TILE_WIDTH);
                    game.walls.push(tile);
                    break;
                case 2:
                    tile = new Floor(x*TILE_WIDTH, y*TILE_WIDTH);
                    game.player = new Player(x*TILE_WIDTH, y*TILE_WIDTH);
                    break;
                case 3:
                    tile = new Floor(x*TILE_WIDTH, y*TILE_WIDTH);
                    game.monsters.push(new Monster(x*TILE_WIDTH, y*TILE_WIDTH));
                    break;
            }
            game.dungeon[x][y] = tile;
        }
    }
}


function initGraphics() {
    canvas = new fabric.Canvas("canvas", {
        selection: false,
        renderOnAddRemove: false
    });

    game.walls.forEach(function(wall, i) {
        canvas.add(wall.g);
    });

    game.monsters.forEach(function(monster, i) {
        canvas.add(monster.g);
    });

    canvas.add(game.player.g);
}


/*******************************************************************************
GAME LOOP FUNCTIONS
*******************************************************************************/
function gameLoop() {
    update();
    draw();
}


function draw() {
    var x = game.player.x - canvas.width/2,
        y = game.player.y - canvas.height/2;

    canvas.absolutePan(new fabric.Point(x, y));
    canvas.renderAll()
}


function update() {
    var xDir = 0,
        yDir = 0;

    if (wKey) --yDir;
    if (sKey) ++yDir;
    if (aKey) --xDir;
    if (dKey) ++xDir;

    game.player.move(xDir, yDir);

    // game.monsters.forEach(function(monster, i) {
    //     monster.doMove();
    // });
}


/*******************************************************************************
CONSTRUCTORS
*******************************************************************************/
function Wall(x, y) {
    this.prototype = Tile;
    this.prototype(x, y);

    this.size = TILE_WIDTH;
    this.g = new fabric.Rect({
        left: x,
        top: y,
        originX: "center",
        originY: "center",
        fill: "red",

        // Slight gaps sometimes appear between wall tiles (probably due to
        // minor rounding errors when centering the rectangle). To fix this,
        // we make them slightly bigger. TODO: Find a better fix for wall gaps.
        width: TILE_WIDTH + 1,
        height: TILE_WIDTH + 1,
        selectable: false,
        hasBorders: false
    });
}

function Floor(x, y) {
    this.prototype = Tile;
    this.prototype(x, y);
}

function Tile(x, y) {
    this.x = x;
    this.y = y;
    this.getIndices = function() {
        return {
            "x": Math.round(this.x / TILE_WIDTH),
            "y": Math.round(this.y / TILE_WIDTH)
        };
    };
}

function Player(xCoord, yCoord) {
    this.prototype = Creature;
    this.prototype(xCoord, yCoord, 50, "blue", 10);
}

function Monster(xCoord, yCoord) {
    this.prototype = Creature;
    this.prototype(xCoord, yCoord, 60, "green", 5);

    // Pick a random starting direction.
    this.facing = Math.floor(Math.random() * 4);
    this.chasingPlayer = false;
    this.path = [];
    this.maxChaseDistance = 5;

    this.seesPlayer = function() {
        // Check if the player is within line of sight in any of the cardinal
        // directions (there shouldn't be a need to look diagonally).
        var coord = this.getTileIndices();
        var tile = game.dungeon[coord.x][coord.y];

        if (containsCreature(tile, game.player)) {
            // The player is in the current tile.
            return true;
        }
        else {
            for (var dir = 0; dir <= 3; ++dir) {
                var coord = this.getTileIndices();
                tile = null;
                do {
                    coord = Direction.getAdjacentCoords(coord.x, coord.y, dir);
                    // Don't bother looking outside the bounds of the map.
                    if (coord.x < 0 || coord.x >= game.dungeon.length) break;
                    if (coord.y < 0 || coord.y >= game.dungeon[0].length) break;

                    tile = game.dungeon[coord.x][coord.y];
                    if (tile instanceof Floor) {
                        if (containsCreature(tile, game.player)) {
                            return true;
                        }
                    }
                } while (tile && tile instanceof Floor);
            }
        }

        return false;
    }

    this.findPlayer = function() {
        // TODO: Find player.
        // Return a path to the player, or an empty path if none can be found.
        // The path should be no longer than maxChaseDistance.

    }

    this.doMove = function() {
        // TODO: To improve performance, calculate a long path to follow.
        //       When the monster reaches the end of the path, pick a new one.
        //       This should improve performance by reducing the number of calculations
        //       made every tick.
        if (this.seesPlayer()) {
            // Move directly towards the player.
            this.chasingPlayer = true;
            this.path = [];
            this.move(game.player.x - this.x, game.player.y - this.y);
        }
        else {
            if (this.chasingPlayer) {
                // TODO: Find path to player.
                // If a path can't be found, set chasingPlayer to false, but leave
                // the current path in case the player is found along it.
                this.chasingPlayer = false; // TESTING
            }
            else if (this.path.length > 0 && containsCreature(this.path[0], this)) {
                this.path.shift();
            }

            if (this.path.length === 0) {
                // If there is no path to follow, find a tile to go to.
                // First look at tiles forward, left, and right. Only if all of
                // them are walls do we go backwards.
                var coord = this.getTileIndices();
                var coords = [
                    Direction.getAdjacentCoords(coord.x, coord.y, Direction.getLeft(this.facing)),
                    Direction.getAdjacentCoords(coord.x, coord.y, this.facing),
                    Direction.getAdjacentCoords(coord.x, coord.y, Direction.getRight(this.facing))
                ];

                var tile = null;
                do {
                    // Look forward, left, and right.
                    var i = Math.floor(Math.random() * coords.length);
                    coord = coords[i];

                    if (game.dungeon[coord.x] && game.dungeon[coord.x][coord.y]) {
                        tile = game.dungeon[coord.x][coord.y];
                    }

                    if (tile instanceof Floor) {
                        this.facing = i;
                        break;
                    }
                    else {
                        tile = null;
                        coords.splice(i, 1);
                    }
                } while (coords.length > 0);

                if (tile === null) {
                    // Go backwards.
                    coord = this.getTileIndices();
                    this.facing = Direction.getBack(this.facing);
                    coord = Direction.getAdjacentCoords(coord.x, coord.y, this.facing);
                    if (game.dungeon[coord.x] && game.dungeon[coord.x][coord.y]) {
                        tile = game.dungeon[coord.x][coord.y];
                    }
                }

                // Add the tile to the path array.
                this.path.push(tile);
            }

            // Move towards the tile at the front of the path array.
            var destination = this.path[0];
            if (!destination) {
                console.log("NO DESTINATION!!!!");
            }
            else {
                this.move(destination.x - this.x, destination.y - this.y);
            }
        }
    };
}


function Creature(xCoord, yCoord, size, color, speed) {
    this.x = xCoord;
    this.y = yCoord;
    this.g = new fabric.Rect({
        left: xCoord,
        top: yCoord,
        originX: "center",
        originY: "center",
        fill: color,
        width: size,
        height: size,
        selectable: false,
        hasBorders: false
    });
    this.movementSpeed = speed;

    this.move = function(dx, dy) {
        // TODO: Optimize wall collision detection. Only check walls that are
        //       immediately arround the creature. This should SIGNIFICANTLY
        //       reduce the number of calculations made each tick. Also, find a
        //       way to correct clipping with walls in one loop rather than 2.

        // Creatures should always move at the same speed. To do this, we take
        // the vector <dx, dy> and change it so that its magnitude is equal to
        // the creature's speed.
        //
        //         newVector = <dx, dy> * (newMagnitude / oldMagnitude)

        var m = Math.sqrt(dx*dx + dy*dy);
        if (m === 0) {
            dx = 0;
            dy = 0;
        }
        else {
            dx = dx * (this.movementSpeed / m);
            dy = dy * (this.movementSpeed / m);
        }

        this.g.left += dx;
        var xDir = 0;
        if (dx > 0) xDir = 1;
        else if (dx < 0) xDir = -1;

        // // Check for wall collisions.
        // for (var i = 0, wall; i < game.walls.length; ++i) {
        //     wall = game.walls[i];
        //     while (collides(this, wall)) {
        //         // Back off until collision no longer occurs.
        //         this.g.left -= xDir;
        //     }
        // }

        this.g.top += dy;
        var yDir = 0;
        if (dy > 0) yDir = 1;
        else if (dy < 0) yDir = -1;

        // // Check for wall collisions.
        // for (var i = 0, wall; i < game.walls.length; ++i) {
        //     wall = game.walls[i];
        //     while (collides(this, wall)) {
        //         // Back off until collision no longer occurs.
        //         this.g.top -= yDir;
        //     }
        // }

        this.x = this.g.left;
        this.y = this.g.top;
    };

    this.getTileIndices = function() {
        var x = Math.round(this.x / TILE_WIDTH);
        var y = Math.round(this.y / TILE_WIDTH);

        return {"x": x, "y": y};
    };
}
