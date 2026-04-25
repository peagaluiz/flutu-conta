import { Drawer } from 'expo-router/drawer';
import { useState } from 'react';
import Icon from '@expo/vector-icons/MaterialIcons';

export default function DrawerLayout() {
    const [sidebarVisible, setSidebarVisible] = useState(true);

    return (
        <Drawer
            screenOptions={{
                drawerType: "permanent",
                overlayColor: "transparent", 
                drawerStyle: { width: sidebarVisible ? "5rem" : 240, transition: "width 0.3s", }, 
                drawerItemStyle: { marginVertical: 5 }, 
                sceneContainerStyle: { marginLeft: sidebarVisible ? "5rem" : 240, transition: "margin 0.3s", }, 
                headerLeft: () => (<Icon name="menu" size={28} style={{ marginLeft: 16 }} onPress={() => setSidebarVisible(!sidebarVisible)} />),
            }} >
            <Drawer.Screen
                name="index"
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="home" size={size} color={color} />
                    ),
                }}
            />

            <Drawer.Screen
                name="insert"
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="add" size={size} color={color} />
                    ),
                }}
            />

            <Drawer.Screen
                name="finance"
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="bar-chart" size={size} color={color} />
                    ),
                }}
            />
        </Drawer>
    );
}
