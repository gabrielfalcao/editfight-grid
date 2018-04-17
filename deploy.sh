#!/bin/bash
set -ex

scp -r index.js public ubuntu@editfight.com:app
ssh ubuntu@editfight.com sudo service editfight restart
