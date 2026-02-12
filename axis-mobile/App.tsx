import "./global.css"; // ★必須
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { ToastProvider } from './context/ToastContext';

const HomeScreen = () => (
  <View className="flex-1 justify-center items-center bg-[#0a0a0a]">
    <Text className="text-white text-xl font-bold">Axis Mobile</Text>
    <Text className="text-orange-500 mt-2">NativeWind v4 Ready</Text>
  </View>
);

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ToastProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ToastProvider>
  );
}