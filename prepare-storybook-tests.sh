#!/bin/bash

storybook_version="$1"

# Check if the version is passed to script
if [ -z "$storybook_version" ]; then
    echo "Error: Storybook version is required"
    exit 1
fi

# Versions supported
versions=(6 7)

# Performing common steps

if [[ " ${versions[*]} " =~ " $storybook_version " ]]; then
    # move package and storybook configs
    mv "./packageV$storybook_version.json" "./package.json"
    mv "./test/.storybook/mainV$storybook_version.js" "./test/.storybook/main.js"
    mv "./babel.config.old.cjs" "./babel.config.cjs"
else
    echo "The value $storybook_version is not a supported version."
fi