// Polyfills must be loaded first
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { registerRootComponent } from 'expo';
import App from './App';

// Note on global font configuration:
// Overriding Text.render causes crashes in current React Native versions.
// To unify fonts, create a custom text component or use NativeWind classes.

registerRootComponent(App);
