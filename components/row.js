import styled from 'styled-components/native';
import { useTheme } from '@rneui/themed';

export const Row = styled.View`
    flexDirection: row;
    marginBottom: 15px;
    gap: 10px;
`;

const HrWrapper = styled.View`
    width: 100%;
    borderBottomWidth: 4px;
    borderColor: ${({ theme }) => theme.colors.surface};
    borderRadius: 30px;
    margin: 10px;
`;

export const Hr = ({ style }) => {
    const { theme } = useTheme();
    return <HrWrapper theme={theme} style={style} />;
};
