import Ionicons from '@expo/vector-icons/Ionicons';
import { View, StyleSheet } from 'react-native';

export default function ButtonNew({ size, color }) {
    return (
        <View style={styles.container}>
            <Ionicons name="add" size={size} color={color} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 50,
        height: 50,
        borderRadius: 20,
        marginBottom: 15,
        backgroundColor: '#34336B',
        alignItems: 'center',
        justifyContent: 'center',
    }
});

