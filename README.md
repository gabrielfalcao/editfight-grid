# EditFight.com: Grid version

*MMO coloring in of a 100x100 pixel grid.*

Live demo: http://editfight.com/

### Run locally:

1. Install nginx.
2. Install npm and node.
3. Patch nginx configuration using `nginx.conf`.
4. Point nginx at port 8080 to `public/`.
5. `./run.sh`

### Run remotely:

1. Install nginx.
2. Install npm and node.
3. Create `editfight` systemd service.
4. Patch nginx configuration using `nginx.conf`.
5. Create `~/app` and put `package.json`, `index.js` and `public/` in there.
6. Run `npm install` in there.