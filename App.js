import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <NavigationContainer>
                    <RootNavigator />
                    <StatusBar style="auto" />
                </NavigationContainer>
            </SafeAreaProvider>
        </Provider>
    );
}
