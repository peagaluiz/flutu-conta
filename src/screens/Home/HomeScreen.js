import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Home({ navigation }) {
    return (
        <View style={styles.container}>
            <View style={[styles.row, { justifyContent: 'space-between', width: '100%', alignItems: 'center' }]}>
                <TouchableOpacity style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => { navigation.navigate('Profile') }}>
                    <Ionicons name="person-circle-outline" size={30} color="white" />
                    <Text style={styles.text}>Bem vindo {this.username}!</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { navigation.navigate('Config') }}>
                    <Ionicons name="cog" size={30} color="white" />
                </TouchableOpacity>
            </View>
            <View style={styles.row}>
                <View style={styles.panelContainer} width='50%'>
                    <Text style={styles.panelTitle}>Salário</Text>
                    <Text style={styles.panelText}>R$ 1.420,48</Text>
                    <Text style={styles.panelSubtitle}>R$ 791,58</Text>
                </View>
                <View style={styles.panelContainer} width='50%'>
                    <Text style={styles.panelTitle}>Gastos</Text>
                    <Text style={styles.panelText}>R$ 751,23</Text>
                    <Text style={styles.panelSubtitle}></Text>
                </View>
            </View>
            <View style={styles.row}>
                <View style={styles.panelContainer} width='100%'>
                    <Text style={styles.panelTitle}>Saldo Disponível</Text>
                    <Text style={styles.panelText}>{1420.48 - 751.23}</Text>
                </View>
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
    text: {
        color: '#fff'
    },
    panelText: {
        fontSize: 20,
        marginTop: 15,
        color: '#fff',
        fontWeight: 'bold',
        alignSelf: 'flex-end',
    },
    panelContainer: {
        borderRadius: 20,
        padding: 20,
        backgroundColor: '#2C2C2C',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderColor: '#4B4B4B',
        borderBottomWidth: 5,
        borderRightWidth: 5,
        borderLeftWidth: 5,
    },
    panelTitle: {
        fontSize: 15,
        position: 'absolute',
        top: 10,
        left: 15,
        color: '#6184FF'
    },
    panelSubtitle: {
        alignSelf: 'flex-end',
        color: '#ccc',
    },
});