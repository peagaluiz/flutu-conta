import styled from 'styled-components/native';
import Ionicons from '@expo/vector-icons/Ionicons';

const Button = styled.TouchableOpacity`
    flex: 1;
    height: 50px;
    borderRadius: 40px;
    backgroundColor: ${props => props.color ? props.color : "#4B4B4B"};
    alignItems: center;
    justifyContent: center;
    borderColor: ${props => props.borderColor ? props.borderColor : "#2C2C2C"};
    borderBottomWidth: 5px;
    borderRightWidth: 5px;
    borderLeftWidth: 5px;
`;

export default function CircleButton({ name, color, borderColor, iconColor, size }) {
    return (
        <Button color={color} borderColor={borderColor}>
            <Ionicons name={name ?? 'quiz'} size={size ?? 30} color={iconColor ?? 'white'} />
        </Button>
    );
}