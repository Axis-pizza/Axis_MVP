// 1. ポリフィルは必ず一番最初に読み込む
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { registerRootComponent } from 'expo';
import App from './App';

// --- 全体のフォント設定について ---
// Text.renderの上書きは現在のReact Nativeではクラッシュの原因になるため削除しました。
// フォントを統一したい場合は、別途カスタムコンポーネントを作成するか、
// NativeWindのクラスで指定することを推奨します。

// AppRegistry.registerComponent は削除し、Expoの registerRootComponent に統一
registerRootComponent(App);