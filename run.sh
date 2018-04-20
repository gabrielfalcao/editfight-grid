#!/bin/bash
set -ex

nginx
nodemon -w index.js index.js
nginx -s quit
