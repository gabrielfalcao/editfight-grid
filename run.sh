#!/bin/bash
set -ex

nginx
nodemon -i 'data*' -i time-lapse -i '.git*'
nginx -s quit
