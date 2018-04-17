#!/bin/bash
set -ex

sudo nginx
nodemon -i 'data*' -i '.git*'
sudo nginx -s quit
