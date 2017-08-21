import createSuite from '@percy-io/react-percy-test-framework';
import { GlobalVariables } from './constants';

global[GlobalVariables.rootSuite] = createSuite(global);
