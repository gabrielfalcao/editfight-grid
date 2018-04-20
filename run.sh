#!/bin/bash
set -ex

nginx
CHEATCODE=foo nodemon -e js index.js
nginx -s quit
