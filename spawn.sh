#!/bin/sh
echo "Starting nodes..."
for ((i=0; i <= 5; i=i+1))
do
    echo $i
    // nohup
    yarn start:dev $i &
done