import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from "../components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";

// Screens
// import ConfigScreen from './screens/Config/ConfigScreen';

// Navigation
const Stack = createNativeStackNavigator();

import TabNavigator from './TabNavigator';
function TabScreen() { return <TabNavigator />; }

export default function StackNavigator() {
    const { theme } = useTheme();

    let themeInverse = theme === 'dark' ? 'light' : 'dark'

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName='TabScreen'>
                <Stack.Screen name="TabScreen" component={TabScreen} options={{ headerShown: false, animation: 'fade' }} />
            </Stack.Navigator>
            <StatusBar style={themeInverse} />
        </NavigationContainer>
    );
}