import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { MenuProvider } from 'react-native-popup-menu';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Divider } from '@rneui/themed';

import { View } from 'react-native';

// Components
import Header from '../components/header';

// Screens
import Home from './screens/Home/HomeScreen';
import InsertScreen from './screens/Insert/InsertScreen';
import FinancesScreen from './screens/Finances/FinancesScreen';
import ProfileScreen from './screens/Profile/ProfileScreen';

import { useTheme } from '@rneui/themed';

// Navigation
const Tab = createBottomTabNavigator()

export default function TabNavigator() {
    var navigation = useNavigation();
    const { theme } = useTheme();

    return (
        <MenuProvider>
            <Tab.Navigator initialRouteName='Home' screenOptions={({ route }) => ({
                headerStyle: { backgroundColor: theme.colors.surface },
                headerShadowVisible: false,
                headerTitleAlign: 'center',
                headerTitleStyle: { color: theme.colors.text },
                headerRight: () => {
                    if (route.name === 'Profile') {
                        return (
                            <Menu>
                                <MenuTrigger customStyles={{triggerWrapper: { top: 0, alignItems: 'center', justifyContent: 'center', flex: 1 }}}>
                                    <Icon name="more-vert" size={30} color={theme.colors.text} />
                                </MenuTrigger>
                                <MenuOptions
                                    customStyles={{
                                        optionsWrapper: {
                                            position: 'absolute',
                                            top: 50,
                                            right: 10,
                                            backgroundColor: theme.colors.tertiary,
                                            borderRadius: 8,
                                            padding: 8,
                                            width: 150
                                        },
                                        optionText: {
                                            color: theme.colors.text
                                        }
                                    }}>
                                    <MenuOption onSelect={() => navigation.navigate('Config')} text='Preferências' />
                                    <Divider width={1} color={theme.colors.border} />
                                    <MenuOption onSelect={() => alert(`Not called`)} disabled={true} text='Sair' />
                                </MenuOptions>
                            </Menu >
                        )
                    }
                },
                tabBarHideOnKeyboard: true,
                tabBarItemStyle: { height: "70%", marginVertical: 5, paddingVertical: 10, borderRadius: 15 },
                tabBarStyle: {
                    backgroundColor: theme.colors.accent,
                    borderTopColor: theme.colors.accent,
                    justifyContent: 'center',
                    height: 80,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    switch (route.name) {
                        case 'Add': iconName = focused ? 'add' : 'add'; break;
                        case 'Home': iconName = focused ? 'home' : 'home'; break;
                        case 'Finances': iconName = focused ? 'payments' : 'payments'; break;
                        case 'Graphics': iconName = focused ? 'bar-chart' : 'bar-chart'; break;
                        case 'Profile': iconName = focused ? 'person' : 'person'; break;
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                }
            })}>
                <Tab.Screen name="Home" options={{
                    headerTitle: () => <Header theme={theme} navigation={navigation} />
                }} component={Home} />
                <Tab.Screen name="Finances" options={{ title: "Financias" }} component={FinancesScreen} />
                <Tab.Screen name="Add" options={{ title: "Adicionar", tabBarLabelStyle: { display: "none" } }} component={InsertScreen} />
                <Tab.Screen name="Graphics" options={{ title: "Gráficos" }} screenOptions component={FinancesScreen} />
                <Tab.Screen name="Profile" options={{ title: "Perfil" }} component={ProfileScreen} />
            </Tab.Navigator>
        </MenuProvider>
    );
}