#!/bin/bash

set -e

SUITE=$1

link () {
  pushd ../../packages/$1
  yarn link
  popd
  yarn link @percy-io/$1
}

if [ "$SUITE" = "react-percy-storybook" ]; then
  # If Percy is enabled, and there's a PERCY_TOKEN supplied (it's not on community PRs),
  # take snapshots of the react-percy-storybook integration tests's stories.
  if [[ "$PERCY_ENABLE" != "0" && -n "$PERCY_TOKEN" ]] ; then
    cd integration-tests/react-percy-storybook
    link react-percy-storybook
    yarn run storybook:percy
  fi
elif [ "$SUITE" = "react-percy" ]; then
  cd integration-tests/react-percy
  link react-percy
  yarn run test
fi
