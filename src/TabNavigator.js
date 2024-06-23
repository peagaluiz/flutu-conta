import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

// Components
import ButtonNew from '../components/buttonNew';

// Screens
import Home from './screens/Home/HomeScreen';
import FinancesScreen from './screens/Finances/FinancesScreen';
import ProfileScreen from './screens/Profile/ProfileScreen';

// Navigation
const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator initialRouteName='Home' screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: '#2C2C2C' },
            headerTitleStyle: { color: '#fff' },
            tabBarStyle: { backgroundColor: '#2C2C2C' },
            tabBarLabelStyle: { display: 'none' },
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                switch (route.name) {
                    case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
                    case 'Finances': iconName = focused ? 'cash' : 'cash-outline'; break;
                    case 'Graphics': iconName = focused ? 'bar-chart' : 'bar-chart-outline'; break;
                    case 'Profile': iconName = focused ? 'person' : 'person-outline'; break;
                }

                if (route.name === 'Add') return <ButtonNew size={size} color={color} />;
                else return <Ionicons name={iconName} size={size} color={color} />;
            }
        })}>
            <Tab.Screen name="Home" options={{ title: "Início" }} component={Home} />
            <Tab.Screen name="Finances" options={{ title: "Financias" }} component={FinancesScreen} />
            <Tab.Screen name="Add" options={{ title: "Adicionar" }} component={FinancesScreen} />
            <Tab.Screen name="Graphics" options={{ title: "Gráficos" }} component={FinancesScreen} />
            <Tab.Screen name="Profile" options={{ title: "Perfil" }} component={ProfileScreen} />
        </Tab.Navigator>
    );
}