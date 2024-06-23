import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function FinancesScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Hello World!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E1E1E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        margin: 10,
        color: '#fff',
    },
});