#!/bin/bash
set -ex

scp index.js ubuntu@editfight.com:app
scp public/{gifs,index}.html ubuntu@editfight.com:app/public
ssh ubuntu@editfight.com sudo service editfight restart
