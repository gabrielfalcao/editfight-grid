# EditFight.com: Grid version

*MMO coloring in of a 100x100 pixel grid.*

Live demo: http://editfight.com/

- Single-file front-end
- Single-file back-end
- 0 front-end dependencies

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

I used [gifenc](https://github.com/lecram/gifenc/) to create the time-lapse
gifs, which was surprisingly simple to use, and pretty fast too.

### Upcoming features

- [x] 32 colors.
- [ ] Easier to use color picker.
- [ ] Scroll wheel cycles between most recently used colors.
- [ ] Choose color at given pixel with middle-click.
- [ ] Left-click and right-click have their own colors.
- [x] Zoom and grid buttons should have icons and not words.
- [ ] Make a side-bar with hamburger button that pops up with gifs/source/donate links.
- [ ] Move shortcut list to that hamburger menu.
- [ ] Thumbnail preview when zoomed in.
- [ ] Say that it’s loading instead of just looking broken...
- [ ] The toolbar and color chooser should be separate floating bars.
- [ ] Maybe a toggle button to resize chat box or something so you can see more.
- [ ] /warn feature for griefers
- [ ] Show user an explanation when kicked.
- [ ] Try some compression of initial data for faster loading time. See if it helps on super-slow connections.
- [ ] /kick should be renamed since it's not really kicking them out, just stopping them from participating for a short while.
- [ ] /kick should increment time they're disabled, increasing the interval at every new kick (per IP). Maybe like 2 minutes, then 4, 8, 16, etc.
- [ ] Fix time-lapse gifs page (gifs.html), because they all start playing at once and that hurts performance a lot.

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