#!/bin/bash
set -ex

scp index.js public/{gifs,index}.html ubuntu@editfight.com:app
ssh ubuntu@editfight.com sudo service editfight restart
