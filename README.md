# EditFight.com: Grid version

*MMO coloring in of a 100x100 pixel grid.*

Live demo: http://editfight.com/

### Rationale

Reddit's r/place was a really cool concept but I never got to play it. So I
wanted to see how little I needed in order to remake something like it myself.

### Technical details

The source is designed assuming there's only one server. All clients connect to
it and all it mainly does is share state through all clients using websockets.
Each client recreates all the state on its own.

Since there's only 16 colors (intentionally), each pixel in the 100x100 grid can
be represented by a single hex-encoded byte. So every time a client connects,
the server sends it a 10,000-character string representing the grid.

The front-end is designed to be just as usable on mobile as on desktop, but
something like 85% of users are desktop users which makes that kind of
pointless. And keeping up the mobile usability is dragging down the desktop
usability. So I'm probably going to make it easier on desktop.

I used [gifenc](https://github.com/lecram/gifenc/) to create the time-lapse
gifs, which was surprisingly simple to use, and pretty fast too.

### Run locally

1. Install nginx.
2. Install npm and node.
3. Patch nginx configuration using `nginx.conf`.
4. Point nginx at port 8080 to `public/`.
5. `./run.sh`

### Run remotely

1. Install nginx.
2. Install npm and node.
3. Create `editfight` systemd service.
4. Patch nginx configuration using `nginx.conf`.
5. Create `~/app` and put `package.json`, `index.js` and `public/` in there.
6. Run `npm install` in there.

### License

> Copyright 2018 Steven Degutis
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.