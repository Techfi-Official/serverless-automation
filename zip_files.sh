#!/bin/bash

output="archive.zip"

# Zip the file or directory
zip -r archive.zip ./* -x "archive.zip" "./zip_files.sh" "./README.md" "./.*" "public/*" "model_AI/*"


echo "all files has been zipped into '$output'"