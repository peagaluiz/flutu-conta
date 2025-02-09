import { ScrollView } from 'react-native';

// Components
import CircleButton from '../../../components/circleButton';
import { Panel } from '../../../components/panel';
import { Title, PanelText, PanelSubText } from '../../../components/text';
import { Row, Hr } from '../../../components/row';
import { Container } from '../../../components/container';
import { useTheme } from '@rneui/themed';
import { TableGastos } from './TableGastos';

export default function Home({ navigation }) {
    const { theme } = useTheme();

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <Container >
                <Row>
                    <Panel>
                        <Title>Saldo em Conta</Title>
                        <PanelText>R$ 1.120,00</PanelText>
                        <PanelSubText>R$ 791,58</PanelSubText>
                        <Hr />
                        <Title>Despesas Pendentes</Title>
                        <PanelText>R$ 540,50</PanelText>
                        <PanelSubText>R$ 579,50</PanelSubText>
                    </Panel>
                </Row>
                <Row>
                    <CircleButton name="search" size={30} />
                    <CircleButton name="filter" size={30} />
                    <CircleButton name="swap-vertical-outline" size={30} />
                </Row>
                <Row>
                    <TableGastos />
                </Row>
            </Container>
        </ScrollView>
    );
}