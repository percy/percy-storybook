if [ "$PERCY_ENABLE" != "0" ] ; then
  cd packages/react-percy-storybook && yarn link &&
    cd ../../integration-tests && yarn && yarn link @percy-io/react-percy-storybook &&
    npm run storybook:percy ;
fi
