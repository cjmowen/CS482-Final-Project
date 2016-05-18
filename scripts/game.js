"use strict";


var TILE_WIDTH = 200,
    CANVAS_WIDTH = 800,
    CANVAS_HEIGHT = 600;

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

var stage,
    world,
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
        .attr("width", CANVAS_WIDTH)
        .attr("height", CANVAS_HEIGHT);

    $("#content").empty().append($element);

    // Set up the map.
    initMap(mapData);
    initGraphics();

    setInterval(gameLoop, 20);
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
    stage = new createjs.Stage("canvas");
    world = new createjs.Container();

    game.walls.forEach(function(wall, i) {
        world.addChild(wall.shape);
    });

    game.monsters.forEach(function(monster, i) {
        world.addChild(monster.shape);
    });

    world.addChild(game.player.shape);
    stage.addChild(world);
}


/*******************************************************************************
GAME LOOP FUNCTIONS
*******************************************************************************/
function gameLoop() {
    update();
    draw();
}

function draw() {
    world.regX = game.player.x - CANVAS_WIDTH/2;
    world.regY = game.player.y - CANVAS_HEIGHT/2;
    stage.update();
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

    this.size = TILE_WIDTH + 2;
    this.shape = new createjs.Shape();
    this.shape.graphics.beginFill("red").drawRect(0, 0, this.size, this.size);
    this.shape.x = x - this.size/2;
    this.shape.y = y - this.size/2;
}

function Floor(x, y) {
    this.prototype = Tile;
    this.prototype(x, y);
}

function Tile(x, y) {
    this.x = x;
    this.y = y;
    this.profile = "square"
    this.getIndices = function() {
        return {
            "x": Math.round(x / TILE_WIDTH),
            "y": Math.round(y / TILE_WIDTH)
        };
    };
}

function Player(xCoord, yCoord) {
    this.prototype = Creature;
    this.prototype(xCoord, yCoord, 20, "blue", 12);
}

function Monster(xCoord, yCoord) {
    this.prototype = Creature;
    this.prototype(xCoord, yCoord, 30, "green", 5);

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
    this.size = size;
    this.profile = "circle";
    this.shape = new createjs.Shape();
    this.shape.graphics.beginFill(color).drawCircle(0, 0, size);
    this.shape.x = this.x;
    this.shape.y = this.y;
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

        var creature = {x: this.x + dx, y: this.y + dy, r: this.size};
        var wall = {x: 0, y: 0, w: 0, h: 0};

        for (var i = 0, w; i < game.walls.length; ++i) {
            w = game.walls[i];
            wall.x = w.shape.x;
            wall.y = w.shape.y;
            wall.w = w.size;
            wall.h = w.size;
            if (collides(creature, wall)) {
                var bounce;
                do {
                    bounce = bounces(creature, wall);
                    if (bounce.x) creature.x += bounce.x;
                    if (bounce.y) creature.y += bounce.y;
                } while (collides(creature, wall));
            }
        }

        this.x = creature.x;
        this.y = creature.y;
        this.shape.x = creature.x;
        this.shape.y = creature.y;
    };

    this.getTileIndices = function() {
        var x = Math.round(this.x / TILE_WIDTH);
        var y = Math.round(this.y / TILE_WIDTH);

        return {"x": x, "y": y};
    };
}


/*******************************************************************************
BORROWED CODE

The collides and bounces functions are slightly modified versions of code posted
by Stack Overflow user kuroi neko.
    http://stackoverflow.com/questions/21089959/detecting-collision-of-rectangle-with-circle
******************************************************************************/
function collides(circle, rect) {
    // compute a center-to-center vector
    var half = { x: rect.w/2, y: rect.h/2 };
    var center = {
        x: circle.x - (rect.x+half.x),
        y: circle.y - (rect.y+half.y)};

    // check circle position inside the rectangle quadrant
    var side = {
        x: Math.abs (center.x) - half.x,
        y: Math.abs (center.y) - half.y};
    if (side.x >  circle.r || side.y >  circle.r) // outside
        return false;
    if (side.x < -circle.r && side.y < -circle.r) // inside
        return true;
    if (side.x < 0 || side.y < 0) // intersects side or corner
        return true;

    // circle is near the corner
    return side.x*side.x + side.y*side.y  < circle.r*circle.r;
}

function bounces(circle, rect) {
    // compute a center-to-center vector
    var half = { x: rect.w/2, y: rect.h/2 };
    var center = {
        x: circle.x - (rect.x+half.x),
        y: circle.y - (rect.y+half.y)};

    // check circle position inside the rectangle quadrant
    var side = {
        x: Math.abs (center.x) - half.x,
        y: Math.abs (center.y) - half.y};
    if (side.x >  circle.r || side.y >  circle.r) // outside
        return { bounce: false };
    if (side.x < -circle.r && side.y < -circle.r) // inside
        return { bounce: false };
    if (side.x < 0 || side.y < 0) // intersects side or corner
    {
        var dx = 0, dy = 0;
        if (Math.abs (side.x) < circle.r && side.y < 0)
        {
            dx = center.x*side.x < 0 ? -1 : 1;
        }
        else if (Math.abs (side.y) < circle.r && side.x < 0)
        {
            dy = center.y*side.y < 0 ? -1 : 1;
        }

        return { bounce: true, x:dx, y:dy };
    }
    // circle is near the corner
    var bounce = side.x*side.x + side.y*side.y  < circle.r*circle.r;
    if (!bounce) return { bounce:false }
    var norm = Math.sqrt (side.x*side.x+side.y*side.y);
    var dx = center.x < 0 ? -1 : 1;
    var dy = center.y < 0 ? -1 : 1;
    return { bounce:true, x: dx*side.x/norm, y: dy*side.y/norm };
}
