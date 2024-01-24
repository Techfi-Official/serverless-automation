#!/bin/bash

output="archive.zip"

# Zip the file or directory
zip -r $output ./* -x "$output" "./node_modules/*" "./zip_files.sh" "./README.md" "./package-lock.json"

echo "all files has been zipped into '$output'"