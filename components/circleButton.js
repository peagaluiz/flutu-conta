import styled from 'styled-components/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@rneui/themed';

const Button = styled.TouchableOpacity`
    flex: 1;
    height: 50px;
    borderRadius: 40px;
    backgroundColor: ${({ theme }) => theme.colors.accent};
    alignItems: center;
    justifyContent: center;
    borderColor: ${({ theme }) => theme.colors.tertiary};
    borderBottomWidth: 5px;
    borderRightWidth: 5px;
    borderLeftWidth: 5px;
`;

export default function CircleButton({ name, color, borderColor, iconColor, size, style }) {
    const { theme } = useTheme();

    return (
        <Button theme={theme} color={color} borderColor={borderColor} style={style}>
            <Ionicons name={name ?? 'quiz'} size={size ?? 30} color={iconColor ?? theme.colors.text} />
        </Button>
    );
}