"use strict";


var TILE_WIDTH = 200,
    CANVAS_WIDTH = 800,
    CANVAS_HEIGHT = 500;

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

var stage,
    world,
    game,
    ui,
    gameLoopIntervalHandle,
    gameSpeed = 20,
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
    if (game.over) {
        reset();
    }
    else {
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

function collidesCircle(obj1, obj2, leeway) {
    var distX = obj2.x - obj1.x;
    var distY = obj2.y - obj1.y;
    var dist = Math.sqrt(distX*distX + distY*distY);

    if (!leeway) leeway = 0;

    return dist <= obj1.size + obj2.size;
}

function cheat(on) {
    if (on) {
        game.player.solid = false;
        game.player.hasKey = true;
    }
    else {
        game.player.solid = true;
    }
}

function winGame() {
    game.over = true;

    showEndGameOverlay();

    var winText = new createjs.Text("You escaped!", "60px Merriweather Sans", "white");
    winText.textAlign = "center";
    winText.textBaseline = "middle";
    winText.x = CANVAS_WIDTH/2;
    winText.y = CANVAS_HEIGHT/2 - 30;
    ui.stage.addChild(winText);
}

function loseGame() {
    game.over = true;

    showEndGameOverlay();

    var winText = new createjs.Text("You died", "60px Merriweather Sans", "white");
    winText.textAlign = "center";
    winText.textBaseline = "middle";
    winText.x = CANVAS_WIDTH/2;
    winText.y = CANVAS_HEIGHT/2 - 30;
    ui.stage.addChild(winText);
}

function showEndGameOverlay() {
    var bg = new createjs.Shape()
    bg.graphics.beginFill("white").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.alpha = .3;
    ui.stage.addChild(bg);

    var overlay = new createjs.Shape();
    overlay.graphics.beginFill("black").drawRect(0, CANVAS_HEIGHT/2 - 100, CANVAS_WIDTH, 200);
    overlay.alpha = .6
    ui.stage.addChild(overlay);

    var overlayBorder = new createjs.Shape();
    overlayBorder.graphics.beginStroke("black").setStrokeStyle(10).drawRect(-50, CANVAS_HEIGHT/2 - 100, CANVAS_WIDTH + 100, 200);
    ui.stage.addChild(overlayBorder);

    var replayText = new createjs.Text("Press any key to play again", "18px Merriweather Sans", "white");
    replayText.textAlign = "center";
    replayText.textBaseline = "middle";
    replayText.x = CANVAS_WIDTH/2;
    replayText.y = CANVAS_HEIGHT/2 + 40;
    ui.stage.addChild(replayText);
}

/*******************************************************************************
INTIALIZATION FUNCTIONS
*******************************************************************************/
/**
* Once the server has sent the map information, set up the game and play!
*/
function initGame(mapData, status) {
    game = {
        dungeon: null,
        walls: null,
        player: null,
        monsters: null,
        door: null,
        key: null,
        goal: null,
        over: false
    };

    ui = {
        stage: null,
        keyIcon: null,
        key: null
    };

    wKey = false;
    aKey = false;
    sKey = false;
    dKey = false;

    // Set up the canvas.
    var $mainCanvas = $("<canvas></canvas>")
        .attr("id", "canvas")
        .attr("width", CANVAS_WIDTH)
        .attr("height", CANVAS_HEIGHT);
    var $uiCanvas = $("<canvas></canvas>")
        .attr("id", "uiCanvas")
        .attr("width", CANVAS_WIDTH)
        .attr("height", CANVAS_HEIGHT);

    $("#content").empty().append($mainCanvas, $uiCanvas);

    // Set up the map.
    initMap(mapData);
    initGraphics();

    gameLoopIntervalHandle = setInterval(gameLoop, gameSpeed);
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
                case 8:
                    tile = new Goal(x*TILE_WIDTH, y*TILE_WIDTH);
                    game.goal = tile;
                    game.walls.push(tile);

                    tile = new Door(x*TILE_WIDTH, y*TILE_WIDTH);
                    game.door = tile;
                    game.walls.push(tile);
                    break;
                case 9:
                    tile = new Floor(x*TILE_WIDTH, y*TILE_WIDTH);
                    game.key = new Key(x*TILE_WIDTH, y*TILE_WIDTH);
                    break;
            }
            game.dungeon[x][y] = tile;
        }
    }
}


function initGraphics() {
    initGameGraphics();
    initUIGraphics();
}

function initGameGraphics() {
    stage = new createjs.Stage("canvas");
    world = new createjs.Container();

    game.walls.forEach(function(wall, i) {
        world.addChild(wall.shape);
    });

    game.monsters.forEach(function(monster, i) {
        world.addChild(monster.shape);
    });

    world.addChild(game.door.shape);
    world.addChild(game.key.shape);
    world.addChild(game.player.shape);
    stage.addChild(world);
}

function initUIGraphics() {
    ui.stage = new createjs.Stage("uiCanvas");

    ui.keyIcon = new createjs.Container();
    ui.keyIcon.setTransform(CANVAS_WIDTH - 60, 60);
    ui.stage.addChild(ui.keyIcon);

    // Start drawing the key.
    ui.key = new createjs.Container();
    ui.key.setTransform(-17, 17, 1, 1, -45);
    ui.keyIcon.addChild(ui.key);

    // The key handle.
    var keyPart = new createjs.Shape();
    keyPart.graphics.beginStroke("yellow").setStrokeStyle(10).drawCircle(0, 0, 12);
    ui.key.addChild(keyPart);

    // The key shaft
    keyPart = new createjs.Shape();
    keyPart.graphics.beginFill("yellow").drawRect(12, -5, 50, 10);
    ui.key.addChild(keyPart);

    // The key teeth.
    var keyTeeth = new createjs.Container();
    ui.key.addChild(keyTeeth);

    // The furthest tooth.
    keyPart = new createjs.Shape();
    keyPart.graphics.beginFill("yellow").drawRect(55, 0, 7, 15);
    keyTeeth.addChild(keyPart);

    // The closest tooth.
    keyPart = new createjs.Shape();
    keyPart.graphics.beginFill("yellow").drawRect(43, 0, 7, 15);
    keyTeeth.addChild(keyPart);

    var keyIconBG = new createjs.Shape();
    keyIconBG.graphics.beginFill("rgba(0, 0, 0, 0.3)").drawCircle(0, 0, 50);
    ui.keyIcon.addChild(keyIconBG);
}

function reset() {
    clearInterval(gameLoopIntervalHandle);
    $.post("/game", initGame);
}


/*******************************************************************************
GAME LOOP FUNCTIONS
*******************************************************************************/
function gameLoop() {
    if (game.over == false) {
        update();
    }
    draw();
}

function draw() {
    if (game.over == false) {
        world.regX = game.player.x - CANVAS_WIDTH/2;
        world.regY = game.player.y - CANVAS_HEIGHT/2;
        stage.update();

        // // TEST
        // var keyString = "";
        // if (game.player.hasKey) {
        //     keyString = "Key: FOUND";
        //     ui.keyIcon.setChildIndex(ui.key, ui.keyIcon.getNumChildren() - 1);
        // }
        // else {
        //     keyString = "Key   (" + (game.key.x - game.player.x) + ", " + (game.key.y - game.player.y) + ")";
        //     ui.keyIcon.setChildIndex(ui.key, 0);
        // }
        //
        // var doorString = "Door (" + (game.door.x - game.player.x) + ", " + (game.door.y - game.player.y) + ")";
        //
        // if (!ui.keyText) {
        //     var text = new createjs.Text(keyString, "30px Merriweather Sans", "purple");
        //     text.x = 20;
        //     text.y = 20;
        //     ui.stage.addChild(text);
        //     ui.keyText = text;
        // }
        // if (!ui.doorText) {
        //     var text = new createjs.Text(doorString, "30px Merriweather Sans", "purple");
        //     text.x = 20;
        //     text.y = 60;
        //     ui.stage.addChild(text);
        //     ui.doorText = text
        // }
        //
        // ui.keyText.text = keyString;
        // ui.doorText.text = doorString;
    }
    ui.stage.update();
}


function update() {
    var xDir = 0,
        yDir = 0;

    if (wKey) --yDir;
    if (sKey) ++yDir;
    if (aKey) --xDir;
    if (dKey) ++xDir;

    game.player.doMove(xDir, yDir);
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
    this.shape.graphics.beginFill("black").drawRect(0, 0, this.size, this.size);
    this.shape.x = x - this.size/2;
    this.shape.y = y - this.size/2;
}

function Door(x, y) {
    this.prototype = Tile;
    this.prototype(x, y);

    this.size = TILE_WIDTH + 2;
    this.locked = true;

    // The door is comprised of multiple graphical parts.
    this.shape = new createjs.Container();
    this.shape.x = x - this.size/2;
    this.shape.y = y - this.size/2;

    // Draw the door.
    var elem = new createjs.Shape();
    elem.graphics.beginFill("brown").drawRect(0, 0, this.size, this.size);
    this.shape.addChild(elem);

    // Draw the key hole, which also involves multiple pieces.
    var keyHole = new createjs.Container();
    keyHole.x = this.size/2;
    keyHole.y = this.size/2 - 25;
    elem = new createjs.Shape();
    elem.graphics.beginFill("black").drawCircle(0, 0, 25);
    elem.x = 0;
    elem.y = 0;
    keyHole.addChild(elem);

    elem = new createjs.Shape();
    elem.graphics.beginFill("black").drawRect(-15, 0, 30, 75);
    elem.x = 0;
    elem.y = 0;
    keyHole.addChild(elem);

    this.shape.addChild(keyHole);
}

function Goal(x, y) {
    this.prototype = Tile;
    this.prototype(x, y);

    this.size = TILE_WIDTH - 10;
    this.shape = new createjs.Container();
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
    this.prototype(xCoord, yCoord, 20, "blue", 10);

    this.hasKey = false;
    this.alive = true;

    this.doMove = function(dx, dy) {
        this.move(dx, dy);
        if (this.hasKey === false) {
            if (collidesCircle(game.player, game.key)) {
                // Pick up the key.
                this.hasKey = true;
                world.removeChild(game.key.shape);
            }
        }

        for (var i = 0, m; i < game.monsters.length; ++i) {
            m = game.monsters[i];
            if (collidesCircle(game.player, m)) {
                loseGame();
            }
        }
    }
}

function Monster(xCoord, yCoord) {
    this.prototype = Creature;
    this.prototype(xCoord, yCoord, 25, "green", 4);

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

    this.doMove = function() {
        if (this.seesPlayer()) {
            // Move directly towards the player.
            this.chasingPlayer = true;
            this.path = [];
            this.move(game.player.x - this.x, game.player.y - this.y);
        }
        else {
            if (this.path.length > 0 && containsCreature(this.path[0], this)) {
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
    this.solid = true;
    this.shape = new createjs.Shape();
    this.shape.graphics.beginFill(color).drawCircle(0, 0, size);
    this.shape.x = this.x;
    this.shape.y = this.y;
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

        var creature = {x: this.x + dx, y: this.y + dy, r: this.size};
        var wall = {x: 0, y: 0, w: 0, h: 0};

        for (var i = 0, w; i < game.walls.length; ++i) {
            w = game.walls[i];
            wall.x = w.shape.x;
            wall.y = w.shape.y;
            wall.w = w.size;
            wall.h = w.size;
            if (collides(creature, wall)) {
                if (w == game.door && this.hasKey) {
                    game.walls.splice(game.walls.indexOf(w), 1);
                    world.removeChild(w.shape);
                    game.door.locked = false;
                }
                else if (this == game.player && w instanceof Goal && game.door.locked == false) {
                    winGame();
                }
                else if (this.solid){
                    var bounce;
                    do {
                        bounce = bounces(creature, wall);

                        // Occasionally bounces will return <0, 0> for the bounce
                        // vector, but collides will say that there is still a
                        // collision. We can just ignore the collision in these
                        // rare cases.
                        if (bounce.x == 0 && bounce.y == 0) break;
                        if (bounce.x) creature.x += bounce.x;
                        if (bounce.y) creature.y += bounce.y;
                    } while (collides(creature, wall));
                }
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


function Key(x, y) {
    this.x = x;
    this.y = y;
    this.size = 25;
    this.shape = new createjs.Container();
    this.shape.setTransform(x, y, 1, 1, -45);

    var key = new createjs.Container();
    this.shape.addChild(key);
    key.x = -12;

    // Key handle.
    var keyPart = new createjs.Shape();
    keyPart.graphics.beginStroke("yellow").setStrokeStyle(4).drawCircle(0, 0, 7);
    key.addChild(keyPart);

    // Key shaft.
    keyPart = new createjs.Shape();
    keyPart.graphics.beginFill("yellow").drawRect(7, -2, 25, 4);
    key.addChild(keyPart);

    // Key teeth.
    var teeth = new createjs.Container();
    key.addChild(teeth);

    keyPart = new createjs.Shape();
    keyPart.graphics.beginFill("yellow").drawRect(29, 0, 3, 7);
    teeth.addChild(keyPart);

    keyPart = new createjs.Shape();
    keyPart.graphics.beginFill("yellow").drawRect(24, 0, 3, 7);
    teeth.addChild(keyPart);
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
