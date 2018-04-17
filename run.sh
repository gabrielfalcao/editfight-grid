#!/bin/bash
set -ex

sudo nginx
nodemon -i 'data*' -i time-lapse -i '.git*'
sudo nginx -s quit
