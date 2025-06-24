import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useTheme } from "../components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";

// Components
import Header from '../components/header';

// Screens
import Home from './screens/Home/HomeScreen';
import InsertScreen from './screens/Insert/InsertScreen';
import FinanceScreen from './screens/Finance/FinanceScreen';

// Navigation
const Tab = createBottomTabNavigator()

export default function TabNavigator() {
    var navigation = useNavigation();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator initialRouteName='Home' safeAreaInsets={{ bottom: 0 }} screenOptions={({ route }) => ({
            tabBarHideOnScroll: true,
            headerShadowVisible: true,
            headerTitleAlign: 'center',
            tabBarHideOnKeyboard: true,
            tabBarShowLabel: false,
            tabBarItemStyle: {
                borderRadius: "50%"
            },
            tabBarIconStyle: {
                height: "100%"
            },
            tabBarStyle: {
                position: 'fixed',
                borderRadius: 30,
                marginBottom: insets.bottom + 10,
                marginTop: 10,
                width: 180,
                height: 65,
                alignSelf: 'center',
                paddingBlock: 50
            },
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                switch (route.name) {
                    case 'Home': iconName = focused ? 'home' : 'home'; break;
                    case 'Insert': iconName = focused ? 'add' : 'add'; break;
                    case 'Finance': iconName = focused ? 'bar-chart' : 'bar-chart'; break;
                }

                return <Icon name={iconName} size={size} className='h-[100%] align-middle' color={color} />;
            }
        })}>
            <Tab.Screen className="w-3/9" name="Home" options={{ headerTitle: () => <Header theme={theme} navigation={navigation} /> }} component={Home} />
            <Tab.Screen className="w-3/9" name="Insert" component={InsertScreen} />
            <Tab.Screen className="w-3/9" name="Finance" component={FinanceScreen} />
        </Tab.Navigator>
    );
}