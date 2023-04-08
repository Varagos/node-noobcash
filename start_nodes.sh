#!/bin/bash

# Get the number of nodes to start from command-line argument
# If no argument is provided, default to 5
num_nodes=${1:-5}

DELAY=5 

# Function to kill all processes with the name "start:dev"
function cleanup() {
    pkill -f start:dev
    exit 0
}

# Set up a trap to call the cleanup function when "CTRL+C" is pressed
trap cleanup SIGINT

# Loop through the number of nodes and start each one
for ((i=0; i<$num_nodes; i++)); do
  node_index=$i
  yarn start:dev $node_index &
  sleep $DELAY 
done

# Wait for all processes to finish before exiting
wait
