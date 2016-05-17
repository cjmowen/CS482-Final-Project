# coding=utf-8
import random


# When converting numbers to directions, use the indices of this array.
_directions = [
    "north",
    "east",
    "south",
    "west"
    ]

# Use this to easily find the opposite of a given cardinal direction.
_opposites = {
    "north": "south",
    "east": "west",
    "south": "north",
    "west": "east"
    }

_gameObjects = {
    # A floor can be represented by None. This is for convenience when converting
    # the map to a list. We can use Tile.spawn as the key for this dictionary,
    # and place the resulting value in the center of its list representation.
    None: 0,
    "floor": 0,
    "wall": 1,
    "player": 2,
    "monster": 3
    }

def getAdjCoords(x, y, dir):

    if dir == "north":
        y -= 1
    elif dir == "east":
        x += 1
    elif dir == "south":
        y += 1
    elif dir == "west":
        x -= 1

    return (x, y)

class Tile:

    def __init__(self, x, y):

        self.paths = {
            "north": False,
            "east": False,
            "south": False,
            "west": False
            }
        self.visited = False
        self.spawn = None
        self.x = x
        self.y = y

    def getAdjCoords(self, direction):

        adjX = self.x
        adjY = self.y
        d = direction.lower()

        if d == "north":
            adjY -= 1
        elif d == "east":
            adjX += 1
        elif d == "south":
            adjY += 1
        elif d == "west":
            adjX -= 1
        else:
            raise ValueError("[Tile.getAdjCoords] %(direction)s is not a valid direction." % locals())

        return (adjX, adjY)

    def connectTo(self, other, direction):
        d = direction.lower()
        if d not in _directions: raise ValueError("[Tile.connectTo] %(direction) is not a valid direction." % locals())

        self.paths[direction] = True
        other.paths[_opposites[direction]] = True

class Map:

    def __init__(self, width=10, height=15):

        if width <= 0 or height <= 0: raise ValueError("[Map.__init__] Dimensions must be greater than 0.")

        self.maze = {}
        self.width = width
        self.height = height

        # Initialize all the tiles in the map. Using a dictionary with tuples
        # for keys is nicer and easier to read than using a typical 2D list.
        for x in range(self.width):
            for y in range(self.height):
                self.maze[(x, y)] = Tile(x, y)

        self.makePaths()
        self.setPlayerSpawn()
        self.setMonsterSpawns(4) # TODO: Have variable number of monsters depending on map size.

    def getRandomCoord(self):

        x = random.randint(0, self.width - 1)
        y = random.randint(0, self.height - 1)

        return (x, y)

    def makePaths(self):

        # Pick a random starting location
        # x = random.randint(0, self.width - 1)
        # y = random.randint(0, self.height - 1)
        (x, y) = self.getRandomCoord()
        tile = self.maze[(x, y)]
        stack = [tile]

        # Keep creating paths until the stack is empty.
        while len(stack) > 0:
            # The current element is the one at the top of the stack.
            tile = stack[-1]

            # Look in random directions for unvisited tiles.
            # Note: adjTile == None represents a coordinate that is not on the map.
            directions = _directions[:]
            adjTile = None
            d = ""
            while len(directions) > 0 and (adjTile == None or adjTile.visited == True):
                d = random.choice(directions)
                directions.remove(d)

                # Only bother looking if a path hasn't already been made inn that direction.
                if tile.paths[d] == False:
                    (x, y) = tile.getAdjCoords(d)
                    if (x, y) in self.maze:
                        adjTile = self.maze[(x, y)]

            # If we find no unvisited tiles adjacent to the current one, we then
            # backtrack to the previous tile by popping the current one off of
            # the stack.
            if adjTile == None or adjTile.visited == True:
                stack.pop()

            # If we find an unvisited tile, we connect it to the current tile,
            # and mark it as visited. We then push it to the top of the stack
            # to become the next current tile.
            else:
                tile.connectTo(adjTile, d)
                adjTile.visited = True
                stack.append(adjTile)

    def setPlayerSpawn(self):

        # Find a tile that has nothing spawning in it.
        tile = None
        while tile == None or tile.spawn != None:
            (x, y) = self.getRandomCoord()
            tile = self.maze[(x, y)]

        tile.spawn = "player"

    def setMonsterSpawns(self, numMonsters):

        # TODO: Try to prevent monsters from spawning too close to the player.
        # Randomly set spawns for the specified number of monsters.
        for i in range(numMonsters + 1):
            tile = None
            while tile == None or tile.spawn != None:
                (x, y) = self.getRandomCoord()
                tile = self.maze[(x, y)]

            tile.spawn = "monster"

    def isOutOfBounds(self, x, y):

        return x < 0 or x >= self.width or y < 0 or y >= self.height

    def toList(self):

        # Each tile is represented in the 2D list as a 3x3 square of numbers.
        # Numbers represent objects in the game as follows:
        #   0: Empty floor
        #   1: Wall
        #   2: Player spawn
        #   3: Monster spawn
        #
        # We convert tile coordinates to list indices like so:
        #   i = 3*c + k
        #
        # Where:
        #   i: list index
        #   c: coordinate (works for both x and y)
        #   k: offset within the 3x3 representation of the tile
        #
        # A tile with paths leading to the North, South, and West would be
        # represented as follows (with index variables shown):
        #   __|_x1_x2_x3_
        #   y1| 1  0  1
        #   y2| 0  0  1
        #   y3| 1  0  1

        result = [[1 for y in range(self.height * 3)] for x in range(self.width * 3)]

        for x in range(self.width):
            for y in range(self.height):
                tile = self.maze[(x, y)]
                x1 = 3*x
                x2 = x1 + 1
                x3 = x1 + 2
                y1 = 3*y
                y2 = y1 + 1
                y3 = y1 + 2

                # The center is either a floor or whatever is supposed to spawn
                # in this.tile.
                result[x2][y2] = _gameObjects[tile.spawn]

                # Open up paths if needed.
                if tile.paths["north"]: result[x2][y1] = 0
                if tile.paths["east"]:  result[x3][y2] = 0
                if tile.paths["south"]: result[x2][y3] = 0
                if tile.paths["west"]:  result[x1][y2] = 0

        return result

    def __str__(self):

        result = "\n"
        for y in range(self.height):
            for x in range(self.width):
                t = self.maze[(x, y)]
                paths = (t.paths["north"], t.paths["east"], t.paths["south"], t.paths["west"])

                if paths == (True, True, True, True):
                    result += "╬"
                elif paths == (True, True, True, False):
                    result += "╠"
                elif paths == (True, True, False, True):
                    result += "╩"
                elif paths == (True, False, True, True):
                    result += "╣"
                elif paths == (False, True, True, True):
                    result += "╦"
                elif paths == (True, True, False, False):
                    result += "╚"
                elif paths == (True, False, True, False):
                    result += "║"
                elif paths == (False, True, True, False):
                    result += "╔"
                elif paths == (True, False, False, True):
                    result += "╝"
                elif paths == (False, True, False, True):
                    result += "═"
                elif paths == (False, False, True, True):
                    result += "╗"
                elif paths == (True, False, False, False):
                    result += "╨"
                elif paths == (False, True, False, False):
                    result += "╞"
                elif paths == (False, False, True, False):
                    result += "╥"
                elif paths == (False, False, False, True):
                    result += "╡"
                elif paths == (False, False, False, False):
                    result += "□"
                else:
                    result += "╳"

            result += "\n"

        return result

    def __contains__(self, coordinate):
        return coordinate in self.maze

m = Map()
print m
lst = m.toList()

string = ""
for y in range(len(lst[0])):
    for x in range(len(lst)):
        val = lst[x][y]
        if val == 1:
            string += "*"
        elif val == 2:
            string += "P"
        elif val == 3:
            string += "M"
        else:
            string+= " "

    string += "\n"

print string
