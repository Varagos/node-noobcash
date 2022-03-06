#!/bin/bash

gnome-terminal --tab -e "yarn start:dev 0" --tab -e "sh -c 'sleep 2; yarn start:dev 1'" --tab -e "sh -c 'sleep 3; yarn start:dev 2'" --tab -e "sh -c 'sleep 4; yarn start:dev 3'" --tab -e "sh -c 'sleep 5; yarn start:dev 4'"