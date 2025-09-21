import { useState } from "react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { useWindowDimensions } from 'react-native';
import { isWeb } from '@gluestack-ui/nativewind-utils/IsWeb';

import HeaderBrand from '@/components/header_brand';
import HeaderButtons from '@/components/header_buttons';

import Home from './screens/Home/HomeScreen';
import FinanceScreen from './screens/Finance/FinanceScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

export default function RootNavigator() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const renderIcon = (route, color, size) => {
        let iconName;
        switch (route.name) {
            case 'Home': iconName = 'home'; break;
            case 'Finance': iconName = 'bar-chart'; break;
        }
        return <Icon name={iconName} size={size} color={color} />;
    };

    const getScreens = (Navigator) => (
        <Navigator.Screen
            name="Home"
            options={{
                headerTitle: () => <HeaderBrand theme={theme} />,
                headerRight: () => <HeaderButtons theme={theme} navigation={navigation} />,
                drawerIcon: ({ color, size }) => renderIcon({ name: 'Home' }, color, size),
                tabBarIcon: ({ color, size }) => renderIcon({ name: 'Home' }, color, size),
            }}
            component={Home}
        />
    );

    const screens = (Navigator) => (
        <>
            {getScreens(Navigator)}
            <Navigator.Screen
                name="Insert"
                component={() => { navigation.navigate('Config') }}
                options={{
                    tabBarIcon: ({ color, size }) => renderIcon({ name: 'Insert' }, color, size)
                }}
            />
            <Navigator.Screen
                name="Finance"
                component={FinanceScreen}
                options={{
                    drawerIcon: ({ color, size }) => renderIcon({ name: 'Finance' }, color, size),
                    tabBarIcon: ({ color, size }) => renderIcon({ name: 'Finance' }, color, size),
                }}
            />
        </>
    );

    const tabScreenOptions = ({ route }) => ({
        tabBarHideOnScroll: true,
        headerShadowVisible: true,
        headerTitleAlign: 'center',
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarItemStyle: { borderRadius: "50%" },
        tabBarIconStyle: { height: "100%" },
        tabBarStyle: {
            position: 'fixed',
            borderRadius: 30,
            marginBottom: insets.bottom + 10,
            marginTop: 10,
            width: 180,
            height: 65,
            alignSelf: 'center',
            paddingBlock: 50,
        },
        tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            switch (route.name) {
                case 'Home': iconName = 'home'; break;
                case 'Finance': iconName = 'bar-chart'; break;
                case 'Insert': iconName = 'plus'; break;
            }
            return (
                <Icon
                    name={iconName}
                    size={size}
                    className="h-[100%] align-middle"
                    color={color}
                />
            );
        },
    });

    if (isWeb) {
        const [sidebarVisible, setSidebarVisible] = useState(true);

        return (
            <Drawer.Navigator
                screenOptions={{
                    drawerType: "permanent",
                    overlayColor: "transparent",
                    drawerStyle: {
                        width: sidebarVisible ? "5rem" : 240,
                        transition: "width 0.3s",
                    },
                    drawerItemStyle: { marginVertical: 5 },
                    sceneContainerStyle: {
                        marginLeft: sidebarVisible ? "5rem" : 240,
                        transition: "margin 0.3s",
                    },
                    headerLeft: () => (
                        <Icon
                            name="menu"
                            size={28}
                            style={{ marginLeft: 16 }}
                            onPress={() => setSidebarVisible(!sidebarVisible)}
                        />
                    ),
                }}
            >
                {screens(Drawer)}
            </Drawer.Navigator>
        );
    }

    return (
        <Tab.Navigator
            initialRouteName="Home"
            safeAreaInsets={{ bottom: 0 }}
            screenOptions={tabScreenOptions}
        >
            {screens(Tab)}
        </Tab.Navigator>
    );
}
