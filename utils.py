import yaml
import json
import math


def getJsonFromYamlFile(filename):
    # Load the contents of the file first.
    f = open(filename, "r")
    yamlString = f.read()

    # Return the contents as a json object.
    return json.dumps(yaml.load(yamlString))

def getMap(width, height, dist):
    coords = []

    for x in range(dist, width, dist):
        for y in range(dist, height, dist):
            coords.append({"name": "(" + str(x) + ", " + str(y) + ")", "x": x, "y": y})

    for a in coords:
        a["adj"] = []
        for b in coords:
            if a["x"] == b["x"] and (abs(a["y"] - b["y"]) == dist):
                a["adj"].append(b["name"])
            elif a["y"] == b["y"] and (abs(a["x"] - b["x"]) == dist):
                a["adj"].append(b["name"])

    return coords
