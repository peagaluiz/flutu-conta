import styled from 'styled-components/native';
import { useTheme } from '@rneui/themed';

const ContainerWrapper = styled.View`
    flex: 1;
    padding: 20px;
    backgroundColor: ${({ theme }) => theme.colors.surface};
`;

export const Container = ({ children, style }) => {
    const { theme } = useTheme();
    return <ContainerWrapper theme={theme} style={style}>{children}</ContainerWrapper>;
}