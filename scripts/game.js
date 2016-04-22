"use strict";


(function() {
    var canvas;

    var game = {
        id: null,
        player: null,
        opponents: [],
        map: []
    };

    $(function() {
        canvas = new fabric.Canvas("canvas");
        joinGame();
        setInterval(draw, 20);
    });

    /**
     * Ask the server for a game to play, and initialize everything.
     */
    function joinGame() {
        console.log("Getting");
        $.get("/join", function(data, status) {
            console.log("Got");
            data = $.parseJSON(data);
            var dist = data.dist;
            var grid = data.grid;
            grid.forEach(function(point, i) {
                game.map.push(new Territory(point.name, point.x, point.y));
            });


        });
    }

    /**
     * Create the UI and add all of the territories to the map.
     */
    function initGraphics() {
        game.map.forEach(function(t, i) {

        });

        game.map.forEach(function(t, i) {
            canvas.add(t.graphics);
        });
    }

    function draw() {
        canvas.renderAll();
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
        var numArmies = 0;
        var owner = null;

        var icon = new fabric.Circle({
            radius: 20,
            originX: "center",
            originY: "center",
            fill: "#AAA"
        });

        this.graphics = new fabric.Group([icon], {
            left: x,
            top: y,
            originX: "center",
            originY: "center"
        });

        canvas.add(this.graphics);

        this.owner = function(player) {
            if (player) {
                owner = player;
                icon.color = player.getColor();
            }
            else {
                return owner;
            }
        };

        this.numArmies = function() {
            return numArmies;
        };

        this.addArmies = function(num) {
            if (num < 1)
            numArmies += num;
        };

        this.removeArmies = function(num) {
            if (num < 1 || num > numArmies) throw new Error("Cannot remove " + num + " armies.");
            numArmies -= num;
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

})();
