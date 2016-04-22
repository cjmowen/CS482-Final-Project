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


jinjaEnv = jinja2.Environment(autoescape=True,
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__),
        "templates")))

defaultWidth = 1000;
defaultHeight = 600;
defaultDist = 100;

class MainHandler(webapp2.RequestHandler):
    def get(self):
        template = jinjaEnv.get_template("game.html")
        self.response.write(template.render({"width": defaultWidth, "height": defaultHeight}))

class JoinHandler(webapp2.RequestHandler):
    def get(self):
        grid = utils.getMap(defaultWidth, defaultHeight, defaultDist)
        data = {"dist": defaultDist, "grid": grid}
        self.response.write(json.dumps(data))


app = webapp2.WSGIApplication([
    ("/", MainHandler),
    ("/join", JoinHandler)
], debug=True)
