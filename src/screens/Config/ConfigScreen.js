import { StyleSheet, View, Button } from 'react-native';
import { useThemeMode } from '@rneui/themed';

export default function ConfigScreen({ navigation }) {
    const { mode, setMode } = useThemeMode();

    return (
        <View style={styles.container}>
            <View style={[styles.row, { justifyContent: 'space-between', width: '100%', alignItems: 'center' }]}>
                <Button title="Sair" onPress={() => { console.log('Sair'); }} />
                <Button title="Mudar tema" onPress={() => { setMode(mode == 'dark' ? 'light' : 'dark'); }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 15,
    },
});