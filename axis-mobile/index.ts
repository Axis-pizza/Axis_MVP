// 1. ポリフィルは必ず一番最初に読み込む
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import React from 'react';
import { Text, TextInput, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// --- 全体のフォントを一括変更する設定 ---
const defaultFontFamily = {
  style: {
    // process.platform ではなく Platform.OS を使用する
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
  },
};

// Textコンポーネントのデフォルトを上書き
// @ts-ignore
const oldTextRender = Text.render;
// @ts-ignore
Text.render = function (...args) {
  const origin = oldTextRender.call(this, ...args);
  return React.cloneElement(origin, {
    style: [defaultFontFamily.style, origin.props.style],
  });
};

// TextInput (入力欄) のデフォルトも上書き
// @ts-ignore
const oldTextInputRender = TextInput.render;
// @ts-ignore
TextInput.render = function (...args) {
  const origin = oldTextInputRender.call(this, ...args);
  return React.cloneElement(origin, {
    style: [defaultFontFamily.style, origin.props.style],
  });
};

// AppRegistry.registerComponent は削除し、Expoの registerRootComponent に統一
registerRootComponent(App);