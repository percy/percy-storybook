#!/bin/bash

set -e

npm run build

node scripts/setup-integration-tests.js

cd integration-tests
npm test -- $@
