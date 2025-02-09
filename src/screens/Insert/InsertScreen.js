import { useState } from 'react';
import { Keyboard, Text } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Icon from '@expo/vector-icons/MaterialIcons';
import { Input, useTheme, ButtonGroup } from '@rneui/themed';

// Components
import { Panel } from '../../../components/panel';
import { Row } from '../../../components/row';
import { Container } from '../../../components/container';

export default function InsertScreen() {
    const { theme } = useTheme();

    const [date, setDate] = useState(new Date());
    const [Tipo, setTipo] = useState(1);

    return (
        <Container>
            <Input
                id='date'
                textAlign='center'
                label="Data"
                leftIcon={<Icon name="chevron-right" size={20} color={theme.colors.text} />}
                rightIcon={<Icon name="calendar-today" size={20} color={theme.colors.text} />}
                placeholder="Insira a data"
                value={date.toLocaleDateString("pt-BR").toString()}
                onTouchStart={(e) => {
                    (e).preventDefault();

                    Keyboard.dismiss();

                    DateTimePickerAndroid.open({
                        value: new Date(),
                        mode: 'date',
                        onChange: (event, selectedDate) => setDate(new Date(selectedDate)),
                    });
                }}
            />

            <Input
                id='description'
                textAlign='left'
                label="Descrição"
                placeholder="Insira a descrição"
                value={{}}
                onTouchStart={(e) => {
                    (e).preventDefault();
                }}
            />

            <Input
                id='value'
                textAlign='right'
                label="Valor"
                placeholder="0,00"
                keyboardType='numeric'
                value={0.00}
            />

            <ButtonGroup
                buttons={[
                    <Text>Receita</Text>,
                    <Text>Despesa</Text>,
                    <Text>Investimento</Text>,
                ]}
                selectedIndex={Tipo}
                onPress={setTipo}
            />
        </Container>
    );
}