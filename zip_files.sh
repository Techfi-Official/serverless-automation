#!/bin/bash

output="archive.zip"

# Zip the file or directory
zip -r $output ./* -x "$output" "./zip_files.sh" "./README.md" "./.*"

echo "all files has been zipped into '$output'"