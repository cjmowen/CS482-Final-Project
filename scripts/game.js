"use strict";


// (function() {
    var canvas;

    var game = {
        id: null,
        player: null,
        opponents: [],
        map: []
    };

    $(function() {
        setInterval(draw, 20);
        joinGame();
    });

    /**
     * Ask the server for a game to play, and initialize everything.
     */
    function joinGame() {
        $.get("/join", function(data, status) {
            data = $.parseJSON(data);
            var dist = data.dist;
            var grid = data.grid;

            // Add all of the territories to the map.
            grid.forEach(function(point, i) {
                game.map.push(new Territory(point.name, point.x, point.y));
            });

            // Connect adjacent territories.
            game.map.forEach(function(t, i) {
                var point = grid[i];
                point.adj.forEach(function(adjName, j) {
                    for (var k = 0; k < game.map.length; ++k) {
                        if (game.map[k].name === adjName) {
                            t.adjacent.push(game.map[k]);
                        }
                    }
                });
            })

            // Once we get the data form the server, start setting up the game.
            initGame();
        });
    }

    function initGame() {
        initGraphics();
    }

    /**
     * Create the UI and add all of the territories to the map.
     */
    function initGraphics() {
        canvas = new fabric.Canvas("canvas");

        // Draw the lines connecting territories.
        game.map.forEach(function(t, i) {
            t.adjacent.forEach(function(tAdj, iAdj) {
                canvas.add(new fabric.Line([t.x, t.y, tAdj.x, tAdj.y], {
                    stroke: "black"
                }));
            });
        });

        // Draw the territories.
        game.map.forEach(function(t, i) {
            canvas.add(t.graphics);
        });
    }

    function draw() {
        if (canvas) canvas.renderAll();
    }

    /**
     * A territory on the map.
     * @param {String} name The name of the territory.
     * @param {Number} x    The x-coordinate for this territory.
     * @param {Number} y    The y-coordinate for this territory.
     */
    function Territory(name, x, y) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.owner = null;
        this.adjacent = [];
        var numArmies = 0;

        var icon = new fabric.Circle({
            radius: 20,
            originX: "center",
            originY: "center",
            fill: "#AAA"
        });

        var text = new fabric.Text(numArmies.toString(), {
            left: 0,
            top: 0,
            originX: "center",
            fontFamily: "Arial",
            fontSize: 20
        });

        // fabric.Text has no built-in way to vertically center it.
        text.top = -(text.fontSize / 2);

        this.graphics = new fabric.Group([icon, text], {
            left: x,
            top: y,
            originX: "center",
            originY: "center"
        });

        this.setOwner = function(player) {
            owner = player;
            icon.color = player.getColor();
        };

        this.numArmies = function() {
            return numArmies;
        };

        this.addArmies = function(num) {
            if (num < 1) throw new Error("Cannot add " + num + " armies.");

            numArmies += num;
            text.text = numArmies.toString();
        };

        this.removeArmies = function(num) {
            if (num < 1 || num > numArmies) throw new Error("Cannot remove " + num + " armies.");

            numArmies -= num;
            text.text = numArmies.toString();
        }
    }

    /**
     * A player in the game.
     * @param {Object} faction The faction for which the player fights.
     * @param {Number} id      The id for the player (only for the person playing on this browser).
     */
    function Player(faction, id) {
        this.faction = faction;
        var territories = [];
        var reinforcements = 0;

        if (id) {
            // Only assign ids to this player, not the opponents.
            this.id = id;
        }

        this.getColor = function() {
            return this.faction.color;
        };

        this.getTerritories = function() {
            return territories;
        };

        this.numReinforcements = function() {
            return reinforcements;
        };

        this.giveReinforcments = function(num) {
            if (num < 1) throw new Error("Cannot give " + num + " reinforcements.");
            reinforcements += num;
        }
    }

// })();
