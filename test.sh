#!/bin/bash

gnome-terminal --tab -e "sh -c 'sleep 2; yarn start:dev 0'" --tab -e "sh -c 'sleep 2; yarn start:dev 1'" --tab -e "sh -c 'sleep 2; yarn start:dev 2'" --tab -e "sh -c 'sleep 2; yarn start:dev 3'" --tab -e "sh -c 'sleep 2; yarn start:dev 4'"