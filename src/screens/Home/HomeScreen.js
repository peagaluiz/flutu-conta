import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Table, TableWrapper, Row, Rows, Col, Cols, Cell } from 'react-native-table-component';
import Ionicons from '@expo/vector-icons/Ionicons';

const dataExample = {
    tableHead: ['Data', 'Descrição', 'Valor', ''],
    tableData: [
        ['22/06/2024', 'Alimentação', 'R$ 24,00', '0'],
        ['18/06/2024', 'Alimentação', 'R$ 65,00', '1'],
        ['29/05/2024', 'Outros', 'R$ 120,00', '1'],
        ['29/05/2024', 'Outros', 'R$ 120,00', '1'],
        ['29/05/2024', 'Outros', 'R$ 120,00', '1'],
        ['25/05/2024', 'Contas', 'R$ 330,00', '1']
    ]
};

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
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Salário</Text>
                    <Text style={styles.panelText}>R$ 1.420,48</Text>
                    <Text style={styles.panelSubtitle}>R$ 791,58</Text>
                </View>
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Gastos</Text>
                    <Text style={styles.panelText}>R$ 751,23</Text>
                    <Text style={styles.panelSubtitle}></Text>
                </View>
            </View>
            <View style={styles.row}>
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Saldo Disponível</Text>
                    <Text style={styles.panelText}>{1420.48 - 751.23}</Text>
                </View>
            </View>
            <View style={styles.row}>
                <TouchableOpacity style={styles.circleButton} onPress={() => { console.log("modal filter"); }} >
                    <Ionicons name="search" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleButton} onPress={() => { console.log("modal filter"); }} >
                    <Ionicons name="filter" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleButton} onPress={() => { console.log("modal filter"); }} >
                    <Ionicons name="swap-vertical-outline" size={30} color="white" />
                </TouchableOpacity>
            </View>
            <View style={styles.row}>
                <View style={styles.panel}>
                    <SafeAreaView style={{ flexDirection: 'row' }}>
                        <ScrollView style={{ flexDirection: 'row' }}>
                            <Table borderStyle={{ borderWidth: 2, borderColor: '#c8e1ff' }}>
                                <Row data={dataExample.tableHead} style={styles.tableHead} textStyle={styles.text} />
                                <Rows data={dataExample.tableData} textStyle={styles.text} />
                            </Table>
                        </ScrollView>
                    </SafeAreaView>
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
        marginBottom: 15,
        gap: 10
    },
    tableHead: {
        height: 40,
        backgroundColor: '#f1f8ff'
    },
    text: {
        margin: 6,
        color: '#fff'
    },
    circleButton: {
        flex: 1,
        width: 60,
        height: 50,
        borderRadius: 40,
        backgroundColor: '#4B4B4B',
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: '#2C2C2C',
        borderBottomWidth: 5,
        borderRightWidth: 5,
        borderLeftWidth: 5,
    },
    panel: {
        flex: 1,
        width: '100%',
        borderRadius: 20,
        padding: 20,
        backgroundColor: '#4B4B4B',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderColor: '#2C2C2C',
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
    panelText: {
        fontSize: 20,
        marginTop: 15,
        color: '#fff',
        fontWeight: 'bold',
        alignSelf: 'flex-end',
    },
    panelSubtitle: {
        alignSelf: 'flex-end',
        color: '#ccc',
    },
});