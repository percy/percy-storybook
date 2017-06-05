# If Percy is enabled, and there's a PERCY_TOKEN supplied (it's not on community PRs),
# yarn link react-percy-storybook and take snapshots of the integration tests's stories.
if [[ "$PERCY_ENABLE" != "0" && -n "$PERCY_TOKEN" ]] ; then
  cd packages/react-percy-storybook && yarn link &&
    cd ../../integration-tests && yarn && yarn link @percy-io/react-percy-storybook &&
    npm run storybook:percy ;
fi
