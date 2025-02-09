import { StyleSheet, Image, View, Text, ScrollView } from 'react-native';
import { useTheme } from '@rneui/themed';

import { Container } from '../../../components/container';
import { Panel } from '../../../components/panel';
import { Title } from '../../../components/text';

// Temporário / Fazer pesquisa no banco de dados futuramente
const search = {
    userName: 'Luiz Philipe Rosa',
    info: 'Junior Developer / Full Stack',
}

export default function ProfileScreen({ navigation }) {
    const { theme } = useTheme();

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <Container gap={10}>
                <Panel>
                    <Image style={styles.avatar} source={require(`../../../assets/avatar.jpg`)} />
                    <View style={styles.body}>
                        <View style={styles.bodyContent}>
                            <Text style={styles.name}>{search.userName}</Text>
                            <Text style={styles.info}>{search.info}</Text>
                            <Text style={styles.description}>
                                Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                                omittam deseruisse consequuntur ius an,
                            </Text>
                        </View>
                    </View>
                </Panel>

                <Panel style={{ marginTop: 10 }}>
                    <Title>
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an,
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an,
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an
                        Lorem ipsum dolor sit amet, saepe sapientem eu nam. Qui ne assum electram expetendis,
                        omittam deseruisse consequuntur ius an,
                    </Title>
                </Panel>
            </Container>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#1E1E1E',
    },
    panel: {
        flex: 1,
        backgroundColor: '#2C2C2C',
        alignItems: 'center',
        justifyContent: 'top',
        borderRadius: 10,
    },
    avatar: {
        width: 130,
        height: 130,
        borderRadius: 63,
        borderWidth: 4,
        borderColor: 'white',
        marginBottom: 10,
        alignSelf: 'center',
        marginTop: 30
    },
    name: {
        alignSelf: 'center',
        fontSize: 22,
        fontWeight: '600',
    },
    info: {
        alignSelf: 'center',
        fontSize: 16,
        color: '#717171',
        fontWeight: '600',
    },
    description: {
        fontSize: 16,
        marginTop: 10,
        textAlign: 'center',
    }
});