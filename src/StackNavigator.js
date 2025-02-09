import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useThemeMode, useTheme } from '@rneui/themed';
import { setBackgroundColorAsync, setButtonStyleAsync } from 'expo-navigation-bar';

// Screens
import ConfigScreen from './screens/Config/ConfigScreen';

// Navigation
const Stack = createNativeStackNavigator();

import TabNavigator from './TabNavigator';
function TabScreen() { return <TabNavigator />; }

export default function StackNavigator() {
    const { mode } = useThemeMode();
    const { theme } = useTheme();

    let themeInverse = mode === 'dark' ? 'light' : 'dark';

    setBackgroundColorAsync(theme.colors.accent);
    setButtonStyleAsync(themeInverse); 

    return (
        <NavigationContainer theme={theme}>
            <Stack.Navigator initialRouteName='TabScreen' screenOptions={({ route }) => ({
                headerStyle: { backgroundColor: theme.colors.background },
                headerTitleStyle: { color: theme.colors.text },
            })}>
                <Stack.Screen name="TabScreen" component={TabScreen} options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="Config" component={ConfigScreen} options={{ title: "Config", animation: 'slide_from_right' }} />
            </Stack.Navigator>
            <StatusBar style={themeInverse} />
        </NavigationContainer>
    );
}