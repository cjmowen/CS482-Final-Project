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
        self.x = x
        self.y = y

    def getAdjCoords(self, dir):

        adjX = self.x
        adjY = self.y
        lowerDir = dir.lower()

        if lowerDir == "north":
            adjY -= 1
        elif lowerDir == "east":
            adjX += 1
        elif lowerDir == "south":
            adjY += 1
        elif lowerDir == "west":
            adjX -= 1
        else:
            raise ValueError("[Maze.getAdjCoords] Expected 'north', 'east', 'south', or 'west'. Received '%(dir)s'." % locals())

        return (adjX, adjY)

    def connectTo(self, other, direction):
        self.paths[direction] = True
        other.paths[_opposites[direction]] = True


class Map:

    def __init__(self, width=10, height=15):

        self.maze = {}
        self.width = width
        self.height = height

        # Initialize all the tiles in the map. Using a dictionary with tuples
        # for keys is nicer and easier to read than using a typical 2D list.
        for x in range(self.width):
            for y in range(self.height):
                self.maze[(x, y)] = Tile(x, y)

        self.makePaths()


    def makePaths(self):

        # Pick a random starting location
        x = random.randint(0, self.width - 1)
        y = random.randint(0, self.height - 1)
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
            while len(directions) > 0 and (adjTile == None or adjTile.visited == True):
                d = random.choice(directions)
                directions.remove(d)

                # Only bother looking if a path hasn't already been made inn that direction.
                if tile.paths[d] == False:
                    (x, y) = tile.getAdjCoords(d)
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





    def isOutOfBounds(self, x, y):
        return x < 0 or x >= self.width or y < 0 or y >= self.height


    def __str__(self):

        result = "\n"

        for x in range(self.width):
            for y in range(self.height):
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
