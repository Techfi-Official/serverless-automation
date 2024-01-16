#!/bin/bash

output="archive.zip"

# Zip the file or directory
zip -r $output ./* -x "$output" -x "./node_modules/*"

echo "all files has been zipped into '$output'"