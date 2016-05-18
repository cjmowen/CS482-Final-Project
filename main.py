#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import os
import json
import time
import webapp2
import jinja2
import utils


jEnv = jinja2.Environment(autoescape=True,
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__),
        "templates")))

class MainHandler(webapp2.RequestHandler):
    def get(self):
        # TODO: Send a start page where the player can press a button to
        # start the game. Optionally, the player may be able to set certain
        # options for the game (map size, game type, difficulty, etc.).
        template = jEnv.get_template("index.html")
        self.response.write(template.render())


class GameHandler(webapp2.RequestHandler):
    def post(self):
        # TODO: set player, monster, and key spawns
        map = utils.Map(20, 20).toList()
        self.response.headers["Content-Type"] = "application/json"
        self.response.write(json.dumps(map))

app = webapp2.WSGIApplication([
    ("/", MainHandler),
    ("/game", GameHandler)
], debug=True)
