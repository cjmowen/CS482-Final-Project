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
    console.log("Data received from server. Setting up game now.");

    // Set up the canvas.
    console.log("Placing canvas.");
    var $element = $("<canvas></canvas>")
        .attr("id", "canvas")
        .attr("width", 800)
        .attr("height", 600);

    $("#content").empty().append($element);

    // Set up the map.
    initMap(mapData);
    initGraphics();

    setInterval(gameLoop, 20);
}


function initMap(mapData) {
    console.log("Initializing Map");

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
    console.log("Initializing Graphics");
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

    game.monsters.forEach(function(monster, i) {
        monster.doMove();
    });
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
    this.prototype(xCoord, yCoord, 60, "green", 7);

    // The target may be a floor tile or the player. pathToTarget is used when
    // the Monster is pursuing the Player, but it is not within line of sight.
    // We search for the player within the maxPursuitRange, and, if we find
    // them, we put the path to the player in pathToTarget.
    this.target = null;
    this.pathToTarget = [];
    this.pursuingPlayer = false;
    this.maxPursuitRange = 5;

    // Pick a random starting direction.
    this.currentDirection = Math.floor(Math.random() * 4);

    this.playerInSight = function() {
        // Check if the player is within line of sight in any of the cardinal
        // directions (there shouldn't be a need to look diagonally).
        for (var dir = 0; dir <= 3; ++dir) {
            var coord = this.getTileIndices();
            var tile;

            do {
                coord = Direction.getAdjacentCoords(coord.x, coord.y, dir);
                // Don't bother looking outside the bounds of the map.
                if (coord.x < 0 || coord.x >= game.dungeon.length) break;
                if (coord.y < 0 || coord.y >= game.dungeon[0].length) break;

                tile = game.dungeon[coord.x][coord.y];
                if (tile instanceof Floor) {
                    if (containsCreature(tile, game.player)) {
                        console.log("FOUND PLAYER");
                        return true;
                    }
                }
            } while (tile && tile instanceof Floor);
        }
        return false;
    }

    this.getPathToPlayer = function() {
        // Look for the player up to <maxPursuitRange> tiles away.
        var queue = [],
            visited = [],
            success = false,
            node = {
                tile: this.getTileIndices(),
                parent: null,
                distance: 0
            };

        queue.push(node);
        visited.push(node)
        do {
            node = queue.shift();
            if (node.distance < this.maxPursuitRange) {
                for (var dir = 0; dir <= 3; ++dir) {
                    var adjCoord = Direction.getAdjacentCoords(node.tile.x, node.tile.y, dir);
                    if (game.dungeon[adjCoord.x] === undefined || game.dungeon[adjCoord.x][adjCoord.y] === undefined) {
                        continue;
                    }
                    var adjTile = game.dungeon[adjCoord.x][adjCoord.y];

                    if (adjTile instanceof Floor) {
                        var newNode = {
                            tile: adjTile,
                            parent: node,
                            distance: node.distance + 1
                        };

                        if (containsCreature(adjTile, game.player)) {
                            var path = [];

                            do {
                                path.push(newNode.tile);
                                newNode = newNode.parent;
                            } while (newNode);

                            return path;
                        }
                        else if (visited.indexOf(adjTile) < 0) {
                            queue.push(newNode);
                            visited.push(newNode);
                        }
                    }
                }
            }

        } while (queue.length > 0);
    }

    this.getNextTile = function() {
        if (this.pathToTarget.length > 0) {
            // If there are any tiles left in pathToTarget, continue following
            // the path.
            return this.pathToTarget.shift();
        }

        // Pick a tile to move to.
        var tile, dir, coord;
        var directions = [
            Direction.NORTH,
            Direction.EAST,
            Direction.SOUTH,
            Direction.WEST
        ];

        do {
            dir = Math.floor(Math.random() * directions.length);
            if (dir == ((this.currentDirection + 2) % 4) && directions.length > 1) {
                // Going backwards is the last resort.
                continue;
            }
            coord = this.getTileIndices();
            coord = Direction.getAdjacentCoords(coord.x, coord.y, dir);
            directions.splice(dir, 1);

            if (coord.x < 0 || coord.x > game.dungeon.length) continue;
            if (coord.y < 0 || coord.y > game.dungeon[0].length) continue;

            tile = game.dungeon[coord.x][coord.y];
            if (tile instanceof Floor) {
                this.currentDirection = dir;
                return tile;
            }
        } while (directions.length > 0);
    }

    this.doMove = function() {
        // TODO: Monster.move
        var playerSighted = this.playerInSight();
        var destination;

        if (playerSighted) {
            console.log("See player");
            this.target = game.player;
            destination = game.player;
        }
        else {
            if (this.target instanceof Player) {
                var path = this.getPathToPlayer();
                if (path) {
                    this.pathToTarget = path;
                }
            }
            destination = this.getNextTile();
            console.log("DEST: " + destination);
        }

        if (destination) {
            var dx = destination.x - this.x,
                dy = destination.y - this.y;
            this.move(dx, dy);
        }
        else {
            console.log("NO DESTINATION!!!");
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
    this.g.on("moving", function(options) {
        console.log("X: " + g.left + ", Y: " + g.top);
    });
    this.movementSpeed = speed;

    this.move = function(dx, dy) {
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

        // Check for wall collisions.
        for (var i = 0, wall; i < game.walls.length; ++i) {
            wall = game.walls[i];
            while (collides(this, wall)) {
                // Back off until collision no longer occurs.
                this.g.left -= xDir;
            }
        }

        this.g.top += dy;
        var yDir = 0;
        if (dy > 0) yDir = 1;
        else if (dy < 0) yDir = -1;

        // Check for wall collisions.
        for (var i = 0, wall; i < game.walls.length; ++i) {
            wall = game.walls[i];
            while (collides(this, wall)) {
                // Back off until collision no longer occurs.
                this.g.top -= yDir;
            }
        }

        this.x = this.g.left;
        this.y = this.g.top;
    };

    this.getTileIndices = function() {
        var x = Math.round(this.x / TILE_WIDTH);
        var y = Math.round(this.y / TILE_WIDTH);

        return {"x": x, "y": y};
    };
}
