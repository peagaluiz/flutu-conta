import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { RFPercentage } from "react-native-responsive-fontsize";
import Ionicons from '@expo/vector-icons/Ionicons';

// Components
import CircleButton from '../../../components/circleButton';
import { Panel, PanelTitle, PanelText, PanelSubText } from '../../../components/panel';
import { Container, Row, Hr } from './styles';
import TableGastos from './TableGastos';

export default function Home({ navigation }) {

    return (
        <Container>
            <Row style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <TouchableOpacity style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => { navigation.navigate('Profile') }}>
                    <Ionicons name="person-circle-outline" size={30} color="white" />
                    <PanelTitle color="white" align="center">Bem vindo {this.username}!</PanelTitle>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { navigation.navigate('Config') }}>
                    <Ionicons name="cog" size={30} color="white" />
                </TouchableOpacity>
            </Row>
            <Row>
                <Panel>
                    <PanelTitle>Saldo em Conta</PanelTitle>
                    <PanelText>R$ 1.120,00</PanelText>
                    <PanelSubText>R$ 791,58</PanelSubText>
                    <Hr />
                    <PanelTitle>Despesas Pendentes</PanelTitle>
                    <PanelText>R$ 540,50</PanelText>
                    <PanelSubText>R$ 579,50</PanelSubText>
                </Panel>
            </Row>
            <Row>
                <CircleButton name="search" size={30} />
                <CircleButton name="filter" size={30} />
                <CircleButton name="swap-vertical-outline" size={30} />
            </Row>
            <Row style={{ flex: 1 }}>
                <Panel>
                    <Text style={[styles.panelTitle, { alignSelf: 'flex-start', marginBottom: 5 }]}>Visão geral</Text>
                    <TableGastos />
                </Panel>
            </Row>
        </Container>
    );
}

const styles = StyleSheet.create({
    panelTitle: {
        fontSize: RFPercentage(2),
        color: '#6184FF'
    },
    shadowText: {
        textShadowColor: "#000",
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 1
    }
});