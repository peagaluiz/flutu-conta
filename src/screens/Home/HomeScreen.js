import { TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Components
import CircleButton from '../../../components/circleButton';
import { Panel } from '../../../components/panel';
import { Title, PanelText, PanelSubText } from '../../../components/text';
import { Row, Hr } from '../../../components/row';
import { Container } from '../../../components/container';
import TableGastos from './TableGastos';

export default function Home({ navigation }) {
    return (
        <Container>
            <Row style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <TouchableOpacity style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => { navigation.navigate('Profile') }}>
                    <Ionicons name="person-circle-outline" size={30} color="white" />
                    <Title color="white" align="center">Bem vindo LUIZ!</Title>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { navigation.navigate('Config') }}>
                    <Ionicons name="cog" size={30} color="white" />
                </TouchableOpacity>
            </Row>
            <Row>
                <Panel>
                    <Title font="roboto">Saldo em Conta</Title>
                    <PanelText>R$ 1.120,00</PanelText>
                    <PanelSubText>R$ 791,58</PanelSubText>
                    <Hr />
                    <Title font="roboto">Despesas Pendentes</Title>
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
                    <Title font="roboto">Visão geral</Title>
                    <TableGastos />
                </Panel>
            </Row>
        </Container>
    );
}