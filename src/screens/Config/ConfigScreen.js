import { StyleSheet, View, Button } from 'react-native';

export default function ConfigScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <View style={[styles.row, { justifyContent: 'space-between', width: '100%', alignItems: 'center' }]}>
                <Button title="Sair" onPress={() => { console.log('Sair'); }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#1E1E1E',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 15,
    },
});