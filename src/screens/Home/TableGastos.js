import { Component } from 'react';
import { StyleSheet, View, Text, SafeAreaView, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default class TableGastos extends Component {
    constructor(props) {
        super(props);

        this.state = {
            tableHead: ['Tipo', 'Data', 'Valor'],
            widthArr: [55, 90, 120],
            widthArrPerc: ["20%", "40%", "40%"],
            tableData: [
                {
                    "id": 1,
                    "icon": 'cash',
                    "date": "15/01/2022",
                    "qtde": "R$ 1.420,48",
                },
                {
                    "id": 2,
                    "icon": 'car',
                    "date": "05/01/2022",
                    "qtde": "R$ 220,00",
                },
                {
                    "id": 3,
                    "icon": 'car',
                    "date": "05/01/2022",
                    "qtde": "R$ 220,00",
                },
                {
                    "id": 4,
                    "icon": 'car',
                    "date": "05/01/2022",
                    "qtde": "R$ 220,00",
                },
                {
                    "id": 5,
                    "icon": 'car',
                    "date": "05/01/2022",
                    "qtde": "R$ 220,00",
                },
                {
                    "id": 6,
                    "icon": 'car',
                    "date": "05/01/2022",
                    "qtde": "R$ 220,00",
                },
                {
                    "id": 7,
                    "icon": 'car',
                    "date": "05/01/2022",
                    "qtde": "R$ 220,00",
                }
            ],
        }
    }

    render() {
        const state = this.state;

        const Row = ({ item }) => (
            <View style={{ flexDirection: 'row', padding: 15, width: '100%' }}>
                <Ionicons name={item.icon} size={18.2} color='white' style={{ textAlign: 'center', width: '20%' }} />
                <Text style={{ color: 'white', textAlign: 'center', width: '40%' }}>{item.date}</ Text>
                <Text style={{ color: 'white', textAlign: 'right', width: '40%' }}>{item.qtde}</ Text>
            </View>
        );;

        return (
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', padding: 15, width: '100%' }}>
                    <Text style={[{ color: 'white', textAlign: 'center', width: '20%' }, styles.shadowText]} >Tipo</ Text>
                    <Text style={[{ color: 'white', textAlign: 'center', width: '40%' }, styles.shadowText]}>Data</ Text>
                    <Text style={[{ color: 'white', textAlign: 'right', width: '40%' }, styles.shadowText]}>Qtde</ Text>
                </View>
                <FlatList showsVerticalScrollIndicator={false} data={state.tableData} renderItem={Row} style={styles.table} />
            </View >
        );
    }
}

const styles = StyleSheet.create({
    text: {
        margin: 6,
        color: '#fff',
        textAlign: 'center',
    },
    table: {
        width: '100%',
        backgroundColor: '#3d3d3d',
        borderRadius: 15,

    },
    shadowText: {
        textShadowColor: "#000",
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1
    }
});