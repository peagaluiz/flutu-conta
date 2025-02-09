import { TouchableOpacity } from 'react-native';
import { Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Row } from './row';
import { useTheme } from '@rneui/themed';

const HeaderWrapper = ({ navigation, theme }) => {
    return (
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 10, marginBottom: 0 }}>
            <Image source={require('../assets/long-logo.png')} resizeMode='contain' style={{ width: 130, height: 130 }} />
            <TouchableOpacity style={{ width: '50%', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <MaterialIcons name="account-circle" size={30} color={theme.colors.flutu} onPress={() => { navigation.navigate('Profile') }} />
            </TouchableOpacity>
        </Row>
    );
}

export default function Header({ navigation }) {
    const { theme } = useTheme();
    return <HeaderWrapper navigation={navigation} theme={theme} />;
}