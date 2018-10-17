#!/bin/bash

set -ev

SUITE=$1

error() {
  echo "error: $*" >&2
  exit 1
}

if [ "$SUITE" = "storybook-for-react" ]; then
  # If Percy is enabled, and there's a PERCY_TOKEN supplied (it's not on community PRs),
  # take snapshots of the storybook-for-react integration tests's stories.
  if [[ "$PERCY_ENABLE" != "0" && -n "$PERCY_TOKEN" ]] ; then
    cd integration-tests/storybook-for-react
    yarn storybook:percy
  elif [[ "$PERCY_ENABLE" != "0" && "$TRAVIS" != true ]] ; then
    # This is local, when invoking yarn test:integration storybook-for-react w/o PERCY_TOKEN
    error "No PERCY_TOKEN given"
  fi
elif [ "$SUITE" = "storybook-for-vue" ]; then
  # If Percy is enabled, and there's a PERCY_TOKEN supplied (it's not on community PRs),
  # take snapshots of the storybook-for-vue integration tests's stories.
  if [[ "$PERCY_ENABLE" != "0" && -n "$PERCY_TOKEN" ]] ; then
    cd integration-tests/storybook-for-vue
    yarn storybook:percy
  elif [[ "$PERCY_ENABLE" != "0" && "$TRAVIS" != true ]] ; then
    # This is local, when invoking yarn test:integration storybook-for-vue w/o PERCY_TOKEN
    error "No PERCY_TOKEN given"
  fi
elif [ "$SUITE" = "storybook-for-angular" ]; then
  # If Percy is enabled, and there's a PERCY_TOKEN supplied (it's not on community PRs),
  # take snapshots of the storybook-for-angular integration tests's stories.
  if [[ "$PERCY_ENABLE" != "0" && -n "$PERCY_TOKEN" ]] ; then
    cd integration-tests/storybook-for-angular
    yarn storybook:percy
  elif [[ "$PERCY_ENABLE" != "0" && "$TRAVIS" != true ]] ; then
    # This is local, when invoking yarn test:integration storybook-for-angular w/o PERCY_TOKEN
    error "No PERCY_TOKEN given"
  fi
elif [ "$SUITE" = "storybook-for-ember" ]; then
  # If Percy is enabled, and there's a PERCY_TOKEN supplied (it's not on community PRs),
  # take snapshots of the storybook-for-ember integration tests's stories.
  if [[ "$PERCY_ENABLE" != "0" && -n "$PERCY_TOKEN" ]] ; then
    cd integration-tests/storybook-for-ember
    npm i
    npm run storybook:percy
  elif [[ "$PERCY_ENABLE" != "0" && "$TRAVIS" != true ]] ; then
    # This is local, when invoking npm run test:integration storybook-for-ember w/o PERCY_TOKEN
    error "No PERCY_TOKEN given"
  fi
else
  cat <<EOF
Valid targets are:
* storybook-for-react
* storybook-for-vue
* storybook-for-angular
* storybook-for-ember
EOF
fi
