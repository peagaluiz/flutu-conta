import { View, SafeAreaView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Panel } from '../../../components/panel';
import { Title } from '../../../components/text';
import { useTheme } from '@rneui/themed';

// Components
import { Text } from '../../../components/text';

const TableGastosConstructor = ({ theme, state }) => {
    const RowList = ({ item }) => (
        <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 10, width: '100%' }}>
            <View style={{ justifyContent: 'center', width: '20%' }}>
                <MaterialIcons name={item.icon} size={18.2} color={theme.colors.text} />
            </View>

            <View style={{ flexDirection: 'column', width: '80%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <Text style={{ width: '50%' }} align="left" shadow={true}>{item.date}</Text>
                    <Text style={{ width: '50%' }} align="right" shadow={true}>{item.qtde}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <Text style={{ width: '50%' }} align="left" shadow={true}>{item.description}</Text>
                    <Text style={{ width: '50%' }} align="right" shadow={true}>{item.method}</Text>
                </View>
            </View>
        </View>
    );

    const renderRows = () => {
        const rows = [];
        state.tableData.forEach((item, index) => {
            rows.push(<RowList key={index} item={item} />);
        });
        return rows;
    };

    return (
        <Panel>
            <Title style={{ marginBottom: 25 }}>Ultimos lançamentos</Title>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: 15 }}>
                <View style={{ borderRadius: 15 }}>
                    {renderRows()}
                </View>
            </SafeAreaView >
        </Panel>
    );
}

export const TableGastos = () => {
    const { theme } = useTheme();

    const state = {
        tableHead: ['Tipo', 'Data', 'Valor'],
        widthArr: [55, 90, 120],
        widthArrPerc: ["20%", "40%", "40%"],
        tableData: [
            {
                "id": 1,
                "icon": 'payments',
                "date": "15/01/2022",
                "qtde": "R$ 1.420,48",
                "description": "Teste",
                "method": "Pix"
            },
            {
                "id": 2,
                "icon": 'directions-car',
                "date": "05/01/2022",
                "qtde": "R$ 220,00",
                "description": "Teste",
                "method": "Crédito"
            },
            {
                "id": 3,
                "icon": 'directions-car',
                "date": "05/01/2022",
                "qtde": "R$ 220,00",
                "description": "Teste",
                "method": "Pix"
            }
        ],
    };

    return <TableGastosConstructor style={{ width: '100%' }} theme={theme} state={state} />
};