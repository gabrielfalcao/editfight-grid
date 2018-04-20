#!/bin/bash
set -ex

nginx
nodemon -e js index.js
nginx -s quit
