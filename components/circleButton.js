import styled from 'styled-components/native';
import Ionicons from '@expo/vector-icons/Ionicons';

const Button = styled.TouchableOpacity`
    flex: 1;
    height: 50px;
    borderRadius: 40px;
    backgroundColor: ${({ theme }) => theme.colors.dark.secondary};
    alignItems: center;
    justifyContent: center;
    borderColor: ${({ theme }) => theme.colors.dark.border};
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